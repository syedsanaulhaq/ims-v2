// ============================================================================
// Wing Inventory Routes
// ============================================================================
// Shows inventory items for a specific wing

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db/connection.cjs');

const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// ============================================================================
// GET /api/wing-inventory/:wingId - Get all issued items for a wing
// ============================================================================
router.get('/:wingId', requireAuth, async (req, res) => {
  try {
    const { wingId } = req.params;
    const pool = getPool();

    const itemsQuery = `
      SELECT 
        l.*,
        u.FullName as issued_to_name,
        u.Id as issued_to_id
      FROM vw_UserIssuedItemsHistory l
      INNER JOIN AspNetUsers u ON l.issued_to_user_id = u.Id
      WHERE u.intWingID = @wingId
      ORDER BY l.issued_at DESC
    `;

    const result = await pool.request()
      .input('wingId', sql.Int, wingId)
      .query(itemsQuery);

    const items = result.recordset;

    const summary = {
      total_items: items.length,
      total_value: items.reduce((sum, item) => sum + (item.total_value || 0), 0),
      unique_users: new Set(items.map(i => i.issued_to_id)).size,
      returnable_items: items.filter(i => i.is_returnable).length,
      not_returned: items.filter(i => i.is_returnable && i.return_status === 'Not Returned').length,
      overdue: items.filter(i => i.current_return_status === 'Overdue').length
    };

    const userMap = new Map();
    items.forEach(item => {
      const userId = item.issued_to_id;
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          user_id: userId,
          user_name: item.issued_to_name,
          items_count: 0,
          total_value: 0,
          overdue_count: 0
        });
      }
      const userStats = userMap.get(userId);
      userStats.items_count++;
      userStats.total_value += item.total_value || 0;
      if (item.current_return_status === 'Overdue') {
        userStats.overdue_count++;
      }
    });

    const userBreakdown = Array.from(userMap.values()).sort((a, b) => b.total_value - a.total_value);

    res.json({
      items,
      summary,
      userBreakdown
    });
  } catch (error) {
    console.error('❌ Error fetching wing inventory:', error);
    res.status(500).json({ error: 'Failed to fetch wing inventory', details: error.message });
  }
});

module.exports = router;
