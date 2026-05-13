const { sql } = require('../db/connection.cjs');

let tablesEnsured = false;

const normalize = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const parseGroupFromDescription = (description) => {
  const text = String(description || '');
  const groupMatch = text.match(/group\s*[-:]?\s*(\d{1,2})/i);
  if (groupMatch) {
    const parsed = Number(groupMatch[1]);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }

  const digitMatch = text.match(/\b([1-9])\b/);
  if (digitMatch) return Number(digitMatch[1]);

  return null;
};

const roleMatches = (userRole, ruleValue) => {
  const user = normalize(userRole);
  const rule = normalize(ruleValue);
  if (!user || !rule) return false;

  return user === rule;
};

const getWorkflowRoles = async (pool) => {
  await ensureTables(pool);

  const result = await pool.request().query(`
    SELECT role_name
    FROM ims_workflow_roles
    WHERE is_active = 1
    ORDER BY role_name ASC
  `);

  return (result.recordset || []).map((row) => row.role_name).filter(Boolean);
};

const getUserWorkflowRoles = async (pool, userId) => {
  await ensureTables(pool);

  const result = await pool.request()
    .input('userId', sql.NVarChar(450), userId)
    .query(`
      SELECT wr.role_name
      FROM ims_user_workflow_roles uwr
      INNER JOIN ims_workflow_roles wr ON wr.id = uwr.workflow_role_id
      WHERE uwr.user_id = @userId
        AND uwr.is_active = 1
        AND wr.is_active = 1
      ORDER BY wr.role_name ASC
    `);

  return (result.recordset || []).map((row) => row.role_name).filter(Boolean);
};

const getUsersWithWorkflowRoles = async (pool) => {
  await ensureTables(pool);

  const result = await pool.request().query(`
    SELECT
      u.Id AS user_id,
      u.FullName,
      wr.role_name
    FROM ims_user_workflow_roles uwr
    INNER JOIN ims_workflow_roles wr ON wr.id = uwr.workflow_role_id
    INNER JOIN AspNetUsers u ON u.Id = uwr.user_id
    WHERE uwr.is_active = 1
      AND wr.is_active = 1
      AND u.Id IS NOT NULL
      AND wr.role_name IS NOT NULL
      AND LTRIM(RTRIM(wr.role_name)) <> ''
    ORDER BY u.Id, wr.role_name
  `);

  const grouped = new Map();
  for (const row of result.recordset || []) {
    const userId = String(row.user_id || '').trim();
    if (!userId) continue;

    if (!grouped.has(userId)) {
      grouped.set(userId, {
        user_id: userId,
        FullName: row.FullName,
        roles: []
      });
    }

    grouped.get(userId).roles.push(row.role_name);
  }

  return Array.from(grouped.values());
};

const ensureTables = async (pool) => {
  if (tablesEnsured) return;

  await pool.request().query(`
    IF OBJECT_ID('ims_dynamic_workflow_steps', 'U') IS NULL
    BEGIN
      CREATE TABLE ims_dynamic_workflow_steps (
        id INT IDENTITY(1,1) PRIMARY KEY,
        group_number INT NOT NULL,
        step_order INT NOT NULL,
        designation_value NVARCHAR(200) NOT NULL,
        match_mode NVARCHAR(20) NOT NULL DEFAULT 'prefix',
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME NOT NULL DEFAULT GETDATE()
      );

      CREATE INDEX IX_ims_dynamic_workflow_steps_group_step
      ON ims_dynamic_workflow_steps(group_number, step_order, is_active);
    END

    IF OBJECT_ID('ims_request_workflow_state', 'U') IS NULL
    BEGIN
      CREATE TABLE ims_request_workflow_state (
        request_id UNIQUEIDENTIFIER PRIMARY KEY,
        request_approval_id UNIQUEIDENTIFIER NULL,
        group_number INT NOT NULL,
        current_step_order INT NOT NULL,
        total_steps INT NOT NULL,
        status NVARCHAR(30) NOT NULL DEFAULT 'pending',
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME NOT NULL DEFAULT GETDATE()
      );
    END

    IF OBJECT_ID('ims_workflow_roles', 'U') IS NULL
    BEGIN
      CREATE TABLE ims_workflow_roles (
        id INT IDENTITY(1,1) PRIMARY KEY,
        role_name NVARCHAR(100) NOT NULL UNIQUE,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME NOT NULL DEFAULT GETDATE()
      );
    END

    IF OBJECT_ID('ims_user_workflow_roles', 'U') IS NULL
    BEGIN
      CREATE TABLE ims_user_workflow_roles (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id NVARCHAR(450) NOT NULL,
        workflow_role_id INT NOT NULL,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_ims_user_workflow_roles_role
          FOREIGN KEY (workflow_role_id) REFERENCES ims_workflow_roles(id),
        CONSTRAINT UQ_ims_user_workflow_roles_user_role
          UNIQUE (user_id, workflow_role_id)
      );

      CREATE INDEX IX_ims_user_workflow_roles_user
      ON ims_user_workflow_roles(user_id, is_active);

      CREATE INDEX IX_ims_user_workflow_roles_role
      ON ims_user_workflow_roles(workflow_role_id, is_active);
    END

    IF NOT EXISTS (SELECT 1 FROM ims_workflow_roles WHERE role_name = 'DG Admin')
      INSERT INTO ims_workflow_roles (role_name, is_active, created_at, updated_at)
      VALUES ('DG Admin', 1, GETDATE(), GETDATE());

    IF NOT EXISTS (SELECT 1 FROM ims_workflow_roles WHERE role_name = 'DD Admin')
      INSERT INTO ims_workflow_roles (role_name, is_active, created_at, updated_at)
      VALUES ('DD Admin', 1, GETDATE(), GETDATE());

    IF NOT EXISTS (SELECT 1 FROM ims_workflow_roles WHERE role_name = 'AD Admin-I')
      INSERT INTO ims_workflow_roles (role_name, is_active, created_at, updated_at)
      VALUES ('AD Admin-I', 1, GETDATE(), GETDATE());

    IF NOT EXISTS (SELECT 1 FROM ims_workflow_roles WHERE role_name = 'AD Admin-II')
      INSERT INTO ims_workflow_roles (role_name, is_active, created_at, updated_at)
      VALUES ('AD Admin-II', 1, GETDATE(), GETDATE());

    UPDATE ims_workflow_roles
    SET is_active = 0,
        updated_at = GETDATE()
    WHERE role_name = 'AD Admin'
      AND is_active = 1;

    IF NOT EXISTS (SELECT 1 FROM ims_workflow_roles WHERE role_name = 'Storekeeper')
      INSERT INTO ims_workflow_roles (role_name, is_active, created_at, updated_at)
      VALUES ('Storekeeper', 1, GETDATE(), GETDATE());

    IF NOT EXISTS (SELECT 1 FROM ims_workflow_roles WHERE role_name = 'Transport Supervisor')
      INSERT INTO ims_workflow_roles (role_name, is_active, created_at, updated_at)
      VALUES ('Transport Supervisor', 1, GETDATE(), GETDATE());
  `);

  tablesEnsured = true;
};

const getWorkflowSteps = async (pool, groupNumber) => {
  await ensureTables(pool);

  const result = await pool.request()
    .input('groupNumber', sql.Int, groupNumber)
    .query(`
      SELECT id, group_number, step_order, designation_value, match_mode
      FROM ims_dynamic_workflow_steps
      WHERE group_number = @groupNumber
        AND is_active = 1
      ORDER BY step_order ASC, id ASC
    `);

  const rows = result.recordset || [];
  const grouped = new Map();

  for (const row of rows) {
    if (!grouped.has(row.step_order)) {
      grouped.set(row.step_order, []);
    }
    grouped.get(row.step_order).push({
      designation_value: row.designation_value,
      match_mode: row.match_mode || 'prefix'
    });
  }

  return Array.from(grouped.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([step_order, rules]) => ({ step_order, rules }));
};

const getGroupFromRequestItems = async (pool, requestId) => {
  const result = await pool.request()
    .input('requestId', sql.UniqueIdentifier, requestId)
    .query(`
      SELECT im.description
      FROM stock_issuance_items sii
      LEFT JOIN item_masters im ON im.id = sii.item_master_id
      WHERE sii.request_id = @requestId
    `);

  const groups = new Set();
  for (const row of result.recordset || []) {
    const group = parseGroupFromDescription(row.description);
    if (group) groups.add(group);
  }

  if (groups.size === 0) return { groupNumber: null, groups: [] };
  if (groups.size > 1) return { groupNumber: null, groups: Array.from(groups).sort((a, b) => a - b) };

  return { groupNumber: Array.from(groups)[0], groups: Array.from(groups) };
};

const pickApproverForStep = async (pool, stepRules, excludedUserIds = []) => {
  const users = await getUsersWithWorkflowRoles(pool);
  const excludedSet = new Set((excludedUserIds || []).filter(Boolean).map(String));

  const eligible = users.filter((user) => {
    if (excludedSet.has(String(user.user_id))) return false;
    return stepRules.some((rule) => (user.roles || []).some((role) => roleMatches(role, rule.designation_value)));
  });

  if (eligible.length === 0) return null;

  const selected = eligible[0];
  const matchedRule = stepRules.find((rule) => (selected.roles || []).some((role) => roleMatches(role, rule.designation_value)));

  return {
    ...selected,
    matchedRole: matchedRule?.designation_value || null
  };
};

const initializeWorkflowForRequest = async (pool, requestId, submittedBy, requestApprovalId = null) => {
  await ensureTables(pool);

  const { groupNumber, groups } = await getGroupFromRequestItems(pool, requestId);
  if (!groupNumber) {
    return {
      ok: false,
      code: groups.length > 1 ? 'mixed_groups' : 'group_missing',
      groups
    };
  }

  const steps = await getWorkflowSteps(pool, groupNumber);
  if (steps.length === 0) {
    return { ok: false, code: 'workflow_not_defined', groupNumber };
  }

  const firstStep = steps[0];
  const approver = await pickApproverForStep(pool, firstStep.rules, [submittedBy]);
  if (!approver) {
    return { ok: false, code: 'approver_not_found', groupNumber, stepOrder: firstStep.step_order };
  }

  await pool.request()
    .input('requestId', sql.UniqueIdentifier, requestId)
    .input('requestApprovalId', sql.UniqueIdentifier, requestApprovalId)
    .input('groupNumber', sql.Int, groupNumber)
    .input('currentStepOrder', sql.Int, firstStep.step_order)
    .input('totalSteps', sql.Int, steps.length)
    .query(`
      MERGE ims_request_workflow_state AS target
      USING (SELECT @requestId AS request_id) AS src
      ON target.request_id = src.request_id
      WHEN MATCHED THEN
        UPDATE SET
          request_approval_id = @requestApprovalId,
          group_number = @groupNumber,
          current_step_order = @currentStepOrder,
          total_steps = @totalSteps,
          status = 'pending',
          updated_at = GETDATE()
      WHEN NOT MATCHED THEN
        INSERT (request_id, request_approval_id, group_number, current_step_order, total_steps, status, created_at, updated_at)
        VALUES (@requestId, @requestApprovalId, @groupNumber, @currentStepOrder, @totalSteps, 'pending', GETDATE(), GETDATE());
    `);

  return {
    ok: true,
    groupNumber,
    currentStepOrder: firstStep.step_order,
    totalSteps: steps.length,
    approverId: approver.user_id,
    approverName: approver.FullName,
    approverRole: approver.matchedRole
  };
};

const bindRequestApprovalId = async (pool, requestId, requestApprovalId) => {
  await ensureTables(pool);

  await pool.request()
    .input('requestId', sql.UniqueIdentifier, requestId)
    .input('requestApprovalId', sql.UniqueIdentifier, requestApprovalId)
    .query(`
      UPDATE ims_request_workflow_state
      SET request_approval_id = @requestApprovalId,
          updated_at = GETDATE()
      WHERE request_id = @requestId
    `);
};

const advanceWorkflow = async (pool, requestId, actorId) => {
  await ensureTables(pool);

  const stateResult = await pool.request()
    .input('requestId', sql.UniqueIdentifier, requestId)
    .query(`
      SELECT request_id, request_approval_id, group_number, current_step_order, total_steps, status
      FROM ims_request_workflow_state
      WHERE request_id = @requestId
    `);

  if (!stateResult.recordset?.length) {
    return { ok: false, code: 'workflow_state_missing' };
  }

  const state = stateResult.recordset[0];
  if (String(state.status).toLowerCase() === 'completed') {
    return { ok: true, completed: true, alreadyCompleted: true };
  }

  const steps = await getWorkflowSteps(pool, state.group_number);
  if (steps.length === 0) {
    return { ok: false, code: 'workflow_not_defined', groupNumber: state.group_number };
  }

  const currentStep = steps.find((step) => step.step_order === state.current_step_order);
  const actorRoles = await getUserWorkflowRoles(pool, actorId);

  if (currentStep?.rules?.length) {
    const actorAllowed = currentStep.rules.some((rule) => actorRoles.some((role) => roleMatches(role, rule.designation_value)));
    if (!actorAllowed) {
      return {
        ok: false,
        code: 'actor_not_allowed_for_step',
        actorRoles,
        stepOrder: state.current_step_order
      };
    }
  }

  const nextStep = steps.find((step) => step.step_order > state.current_step_order);
  if (!nextStep) {
    await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        UPDATE ims_request_workflow_state
        SET status = 'completed',
            updated_at = GETDATE()
        WHERE request_id = @requestId
      `);

    return { ok: true, completed: true };
  }

  const nextApprover = await pickApproverForStep(pool, nextStep.rules, [actorId]);
  if (!nextApprover) {
    return {
      ok: false,
      code: 'next_approver_not_found',
      nextStepOrder: nextStep.step_order
    };
  }

  await pool.request()
    .input('requestId', sql.UniqueIdentifier, requestId)
    .input('nextStepOrder', sql.Int, nextStep.step_order)
    .query(`
      UPDATE ims_request_workflow_state
      SET current_step_order = @nextStepOrder,
          status = 'pending',
          updated_at = GETDATE()
      WHERE request_id = @requestId
    `);

  return {
    ok: true,
    completed: false,
    nextStepOrder: nextStep.step_order,
    totalSteps: steps.length,
    approverId: nextApprover.user_id,
    approverName: nextApprover.FullName,
    approverRole: nextApprover.matchedRole
  };
};

module.exports = {
  ensureTables,
  getWorkflowSteps,
  getWorkflowRoles,
  getUserWorkflowRoles,
  initializeWorkflowForRequest,
  bindRequestApprovalId,
  advanceWorkflow,
  parseGroupFromDescription,
  roleMatches
};
