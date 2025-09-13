```mermaid
flowchart TD
    %% STEP 1: DEC REQUEST CREATION
    A1[🙋‍♂️ IT Department Head<br/>Creates Request<br/>REQ-2025-001<br/>Rs. 2,50,000<br/>20 Laptops + 5 Desks]
    
    %% STEP 2: WING LEVEL REVIEW
    B1{🏗️ Technical Wing Head<br/>Reviews Request<br/>Amount: Rs. 2,50,000}
    B2[✅ Wing Consolidation<br/>+ Engineering: 10 Laptops<br/>+ Maintenance: 3 Chairs<br/>New Total: Rs. 4,25,000]
    
    %% STEP 3: OFFICE LEVEL REVIEW
    C1{🏢 Assistant Director Admin<br/>Reviews Consolidated Request<br/>Amount: Rs. 4,25,000}
    C2[⚠️ Amount Check<br/>Rs. 4,25,000 > Rs. 3,00,000<br/>My Approval Limit Exceeded]
    C3[📤 Forward to Higher Authority<br/>Needs GG Admin Approval]
    
    %% STEP 4: ADMIN LEVEL APPROVAL
    D1{🎯 General Manager Admin<br/>Final Review<br/>Amount: Rs. 4,25,000}
    D2[✅ GG Admin Approval<br/>Justified Request<br/>Approved for Procurement]
    
    %% STEP 5: PROCUREMENT ACTION
    E1[💼 Procurement Head<br/>Receives Approved Request<br/>Amount: Rs. 4,25,000]
    E2[🏢 Create Tender<br/>TEND-2025-001<br/>Public Tender Required]
    
    %% DECISION POINTS
    B1 -->|Amount ≤ Rs. 1,50,000| B3[✅ Approved at Wing Level]
    B1 -->|Amount > Rs. 1,50,000| B2
    
    C1 -->|Amount ≤ Rs. 3,00,000| C4[✅ Approved at Office Level]
    C1 -->|Amount > Rs. 3,00,000| C2
    
    D1 -->|Amount ≤ Rs. 10,00,000| D2
    D1 -->|Amount > Rs. 10,00,000| D3[📤 Forward to Director Level]
    
    %% FLOW CONNECTIONS
    A1 --> B1
    B2 --> C1
    C2 --> C3
    C3 --> D1
    D2 --> E1
    E1 --> E2
    
    %% STYLING
    classDef decLevel fill:#e3f2fd
    classDef wingLevel fill:#f3e5f5
    classDef officeLevel fill:#fff3e0
    classDef adminLevel fill:#e8f5e8
    classDef procurementLevel fill:#fce4ec
    classDef decision fill:#fff9c4
    classDef action fill:#f1f8e9
    
    class A1 decLevel
    class B1,B2,B3 wingLevel
    class C1,C2,C3,C4 officeLevel
    class D1,D2,D3 adminLevel
    class E1,E2 procurementLevel
```

## 🔄 **APPROVAL HIERARCHY PYRAMID**

```mermaid
pyramid
    title Approval Authority Hierarchy
    
    "🎯 DIRECTOR LEVEL" : "Unlimited Authority<br/>Final Decision Maker<br/>Any Amount"
    "🏛️ GG ADMIN LEVEL" : "Up to Rs. 10,00,000<br/>Major Procurement<br/>Equipment & Furniture"
    "🏢 OFFICE LEVEL" : "Up to Rs. 3,00,000<br/>Office Requirements<br/>Departmental Needs"
    "🏗️ WING LEVEL" : "Up to Rs. 1,50,000<br/>Wing Consolidation<br/>Multi-Department"
    "📋 DEC LEVEL" : "Up to Rs. 50,000<br/>Basic Supplies<br/>Minor Items"
```

## 📊 **APPROVAL FLOW SEQUENCE**

```mermaid
sequenceDiagram
    participant DEC as 📋 DEC Head
    participant Wing as 🏗️ Wing Head
    participant Office as 🏢 AD Admin
    participant Admin as 🎯 GG Admin
    participant Proc as 💼 Procurement
    participant DB as 💾 Database
    
    Note over DEC,DB: Step 1: DEC Request Creation
    DEC->>DB: CREATE approval_request (Rs. 2,50,000)
    DB->>DEC: Request ID: REQ-2025-001
    
    Note over Wing,DB: Step 2: Wing Level Review & Consolidation
    DEC->>Wing: Submit request for approval
    Wing->>DB: CHECK other department needs
    DB->>Wing: Engineering needs 10 laptops
    Wing->>DB: UPDATE request (add items, Rs. 4,25,000)
    Wing->>DB: APPROVE at wing level
    
    Note over Office,DB: Step 3: Office Level Review
    Wing->>Office: Forward consolidated request
    Office->>DB: CHECK approval limits
    DB->>Office: Your limit: Rs. 3,00,000, Request: Rs. 4,25,000
    Office->>DB: FORWARD to higher authority
    
    Note over Admin,DB: Step 4: Admin Level Final Approval
    Office->>Admin: Request needs GG Admin approval
    Admin->>DB: REVIEW request details
    DB->>Admin: All justifications and consolidations
    Admin->>DB: APPROVE for procurement (Rs. 4,25,000)
    
    Note over Proc,DB: Step 5: Procurement Action
    Admin->>Proc: Request approved for procurement
    Proc->>DB: CREATE tender (TEND-2025-001)
    DB->>Proc: Tender created, ready for publication
```

## 📋 **APPROVAL DECISION MATRIX**

```mermaid
graph TB
    subgraph "💰 AMOUNT-BASED ROUTING"
        A1[Request Amount<br/>Rs. X]
        
        A1 --> B1{Amount ≤ Rs. 50,000?}
        A1 --> B2{Rs. 50,001 - Rs. 1,50,000?}
        A1 --> B3{Rs. 1,50,001 - Rs. 3,00,000?}
        A1 --> B4{Rs. 3,00,001 - Rs. 10,00,000?}
        A1 --> B5{Amount > Rs. 10,00,000?}
        
        B1 -->|YES| C1[✅ DEC Head Can Approve<br/>No Higher Approval Needed]
        B2 -->|YES| C2[✅ Wing Head Can Approve<br/>After DEC Approval]
        B3 -->|YES| C3[✅ AD Admin Can Approve<br/>After Wing Approval]
        B4 -->|YES| C4[✅ GG Admin Can Approve<br/>After Office Review]
        B5 -->|YES| C5[✅ Director Approval Required<br/>Highest Authority]
    end
    
    subgraph "📋 APPROVAL ACTIONS"
        D1[Create Request in System]
        D2[Route to Appropriate Authority] 
        D3[Multi-Level Approvals]
        D4[Final Procurement Authorization]
    end
    
    C1 --> D1
    C2 --> D2
    C3 --> D3
    C4 --> D3
    C5 --> D4
    
    classDef amount fill:#e3f2fd
    classDef decision fill:#fff9c4
    classDef approval fill:#e8f5e8
    classDef action fill:#f1f8e9
    
    class A1 amount
    class B1,B2,B3,B4,B5 decision
    class C1,C2,C3,C4,C5 approval
    class D1,D2,D3,D4 action
```
