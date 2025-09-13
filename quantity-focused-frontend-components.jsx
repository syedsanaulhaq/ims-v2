// ====================================================================
// 🔒 QUANTITY-FOCUSED FRONTEND INTERFACES (NO FINANCIAL DISPLAY)
// ====================================================================
// These React components implement the client's requirement to hide
// financial information and focus on quantities and specifications.
// ====================================================================

import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Select, TextArea, Progress, Tag, Alert } from 'antd';
import { 
    ShoppingCartOutlined, 
    CheckCircleOutlined, 
    WarningOutlined,
    ExclamationCircleOutlined,
    InfoCircleOutlined 
} from '@ant-design/icons';

// ====================================================================
// 📦 1. REQUEST CREATION FORM (NO FINANCIAL FIELDS)
// ====================================================================

const QuantityFocusedRequestForm = () => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'NORMAL',
        requiredDate: '',
        items: []
    });
    
    const [selectedItem, setSelectedItem] = useState(null);
    const [currentStock, setCurrentStock] = useState(0);
    const [minimumLevel, setMinimumLevel] = useState(0);

    return (
        <Card title="📦 Create Procurement Request" className="request-form">
            {/* Request Basic Information */}
            <div className="form-section">
                <h4>📋 Request Information</h4>
                <Input 
                    placeholder="Request Title" 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    style={{marginBottom: 12}}
                />
                <TextArea 
                    placeholder="Request Description & Justification" 
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    style={{marginBottom: 12}}
                />
                <Select 
                    placeholder="Priority Level"
                    value={formData.priority}
                    onChange={(value) => setFormData({...formData, priority: value})}
                    style={{width: '100%', marginBottom: 12}}
                >
                    <Select.Option value="LOW">🟢 Low Priority</Select.Option>
                    <Select.Option value="NORMAL">🟡 Normal Priority</Select.Option>
                    <Select.Option value="HIGH">🟠 High Priority</Select.Option>
                    <Select.Option value="URGENT">🔴 Urgent</Select.Option>
                </Select>
            </div>

            {/* Item Selection and Stock Analysis */}
            <div className="form-section">
                <h4>📦 Item Requirements</h4>
                
                <Select 
                    placeholder="Select Item"
                    onChange={(value, option) => {
                        setSelectedItem(value);
                        // Fetch current stock data for selected item
                        fetchStockData(value);
                    }}
                    style={{width: '100%', marginBottom: 12}}
                >
                    <Select.Option value="laptop-001">Laptop Model X - Standard Office</Select.Option>
                    <Select.Option value="printer-001">Printer HP LaserJet</Select.Option>
                    <Select.Option value="desk-001">Office Desk Standard</Select.Option>
                </Select>

                {selectedItem && (
                    <Card size="small" className="stock-analysis-card">
                        <h5>📊 Current Stock Analysis</h5>
                        <div className="stock-info-grid">
                            <div className="stock-item">
                                <span className="label">Current Stock:</span>
                                <span className={`value ${currentStock <= minimumLevel ? 'critical' : 'normal'}`}>
                                    {currentStock} units {currentStock <= minimumLevel ? '🔴' : '🟢'}
                                </span>
                            </div>
                            <div className="stock-item">
                                <span className="label">Minimum Level:</span>
                                <span className="value">{minimumLevel} units</span>
                            </div>
                            <div className="stock-item">
                                <span className="label">Stock Status:</span>
                                <Tag color={currentStock <= 0 ? 'red' : currentStock <= minimumLevel ? 'orange' : 'green'}>
                                    {currentStock <= 0 ? 'OUT OF STOCK' : 
                                     currentStock <= minimumLevel ? 'LOW STOCK' : 'ADEQUATE'}
                                </Tag>
                            </div>
                        </div>
                        
                        {currentStock <= minimumLevel && (
                            <Alert 
                                message="Stock Alert" 
                                description={`Current stock (${currentStock}) is ${currentStock <= 0 ? 'completely depleted' : 'below minimum level'}. Immediate procurement required.`}
                                type="warning" 
                                showIcon 
                                style={{marginTop: 12}}
                            />
                        )}
                    </Card>
                )}

                {/* Quantity Input - No Cost Fields */}
                <div className="quantity-section">
                    <h5>📏 Quantity Requirements</h5>
                    <Input 
                        type="number" 
                        placeholder="Requested Quantity"
                        addonAfter="units"
                        style={{marginBottom: 12}}
                    />
                    
                    {/* Quantity Justification */}
                    <TextArea 
                        placeholder="Quantity Justification (Why this amount is needed)"
                        rows={2}
                        style={{marginBottom: 12}}
                    />
                </div>

                {/* Technical Specifications */}
                <div className="specifications-section">
                    <h5>📋 Technical Specifications</h5>
                    <TextArea 
                        placeholder="Detailed technical requirements and specifications..."
                        rows={4}
                        style={{marginBottom: 12}}
                    />
                    
                    <Input 
                        placeholder="Preferred Brand (if any)"
                        style={{marginBottom: 12}}
                    />
                    
                    <Select 
                        placeholder="Alternative brands acceptable?"
                        style={{width: '100%', marginBottom: 12}}
                    >
                        <Select.Option value={true}>✅ Yes, alternatives acceptable</Select.Option>
                        <Select.Option value={false}>❌ No, specific brand required</Select.Option>
                    </Select>
                </div>
            </div>

            {/* NO FINANCIAL INFORMATION SECTION */}
            
            <div className="form-actions">
                <Button type="primary" icon={<ShoppingCartOutlined />} size="large">
                    Submit Procurement Request
                </Button>
                <Button style={{marginLeft: 8}}>
                    Save as Draft
                </Button>
            </div>
        </Card>
    );
};

// ====================================================================
// 🔍 2. APPROVAL DASHBOARD (QUANTITY-FOCUSED)
// ====================================================================

const QuantityFocusedApprovalDashboard = ({ requestId, userRole }) => {
    const [requestData, setRequestData] = useState(null);
    const [stockAnalysis, setStockAnalysis] = useState([]);

    useEffect(() => {
        // Fetch request data based on user access level (no financial data for most users)
        fetchRequestData(requestId, userRole);
    }, [requestId, userRole]);

    return (
        <div className="approval-dashboard">
            <Card title="🔍 Request Review & Approval" extra={<Tag color="processing">Under Review</Tag>}>
                
                {/* Request Summary */}
                <div className="request-summary">
                    <h4>📋 Request: {requestData?.title}</h4>
                    <p><strong>From:</strong> {requestData?.dec_name}</p>
                    <p><strong>Priority:</strong> 
                        <Tag color={getPriorityColor(requestData?.priority)}>
                            {requestData?.priority}
                        </Tag>
                    </p>
                    <p><strong>Required By:</strong> {requestData?.required_date}</p>
                </div>

                {/* Stock Analysis for Each Item */}
                <div className="stock-analysis-section">
                    <h4>📊 Stock Analysis</h4>
                    {stockAnalysis.map((item, index) => (
                        <Card key={index} size="small" style={{marginBottom: 12}}>
                            <div className="item-analysis">
                                <h5>📦 {item.item_name}</h5>
                                
                                <div className="stock-metrics">
                                    <div className="metric">
                                        <span className="metric-label">Current Stock:</span>
                                        <span className={`metric-value ${item.is_critical ? 'critical' : 'normal'}`}>
                                            {item.current_stock} units
                                            {item.is_critical && <ExclamationCircleOutlined style={{color: 'red', marginLeft: 4}} />}
                                        </span>
                                    </div>
                                    
                                    <div className="metric">
                                        <span className="metric-label">Minimum Level:</span>
                                        <span className="metric-value">{item.minimum_level} units</span>
                                    </div>
                                    
                                    <div className="metric">
                                        <span className="metric-label">Requested:</span>
                                        <span className="metric-value">{item.requested_quantity} units</span>
                                    </div>
                                    
                                    <div className="metric">
                                        <span className="metric-label">After Procurement:</span>
                                        <span className="metric-value success">
                                            {item.current_stock + item.requested_quantity} units
                                            <CheckCircleOutlined style={{color: 'green', marginLeft: 4}} />
                                        </span>
                                    </div>
                                </div>

                                {/* Usage Pattern Analysis */}
                                <div className="usage-analysis">
                                    <h6>📈 Usage Pattern</h6>
                                    <p>Last 6 months: {item.usage_last_6_months} units issued</p>
                                    <p>Monthly average: {item.monthly_average} units</p>
                                    <p>Projected 6-month need: {item.projected_need} units</p>
                                </div>

                                {/* Justification */}
                                <div className="justification">
                                    <h6>📝 Justification</h6>
                                    <p>{item.justification}</p>
                                </div>

                                {/* Technical Specifications */}
                                <div className="specifications">
                                    <h6>📋 Technical Requirements</h6>
                                    <pre>{item.specifications}</pre>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>

                {/* NO FINANCIAL ANALYSIS SECTION */}

                {/* Approval Actions */}
                <div className="approval-actions">
                    <h4>🎯 Approval Decision</h4>
                    
                    <div className="decision-options">
                        <Button 
                            type="primary" 
                            icon={<CheckCircleOutlined />}
                            size="large"
                            style={{marginRight: 12}}
                        >
                            ✅ Approve Request
                        </Button>
                        
                        <Button 
                            danger
                            icon={<WarningOutlined />}
                            size="large"
                            style={{marginRight: 12}}
                        >
                            ❌ Reject Request
                        </Button>
                        
                        <Button size="large">
                            🔄 Return for Clarification
                        </Button>
                    </div>

                    <TextArea 
                        placeholder="Comments and reasoning for decision..."
                        rows={3}
                        style={{marginTop: 12}}
                    />
                </div>
            </Card>
        </div>
    );
};

// ====================================================================
// 📢 3. PUBLIC TENDER NOTICE (SPECIFICATION-ONLY)
// ====================================================================

const PublicTenderNotice = ({ tenderId }) => {
    const [tenderData, setTenderData] = useState(null);
    const [tenderItems, setTenderItems] = useState([]);

    return (
        <Card className="tender-notice">
            <div className="tender-header">
                <h2>📢 TENDER NOTICE</h2>
                <div className="tender-basic-info">
                    <h3>{tenderData?.tender_title}</h3>
                    <p><strong>Tender Reference:</strong> {tenderData?.tender_code}</p>
                    <p><strong>Type:</strong> {tenderData?.tender_type}</p>
                    <Tag color="processing">{tenderData?.status_description}</Tag>
                </div>
            </div>

            {/* Required Items - No Price Information */}
            <div className="tender-requirements">
                <h4>📦 REQUIRED ITEMS</h4>
                {tenderItems.map((item, index) => (
                    <Card key={index} size="small" style={{marginBottom: 16}}>
                        <div className="item-requirement">
                            <h5>Item {index + 1}: {item.item_name}</h5>
                            <div className="requirement-details">
                                <p><strong>Quantity Required:</strong> {item.quantity_required} units</p>
                                <p><strong>Category:</strong> {item.category_name}</p>
                            </div>

                            <div className="specifications">
                                <h6>📋 Technical Specifications</h6>
                                <div className="spec-content">
                                    <pre>{item.detailed_specifications}</pre>
                                </div>
                            </div>

                            <div className="technical-requirements">
                                <h6>🔧 Technical Requirements</h6>
                                <div className="req-content">
                                    <pre>{item.technical_requirements}</pre>
                                </div>
                            </div>

                            <div className="quality-standards">
                                <h6>✅ Quality Standards</h6>
                                <p>{item.quality_standards}</p>
                            </div>

                            <div className="requirement-type">
                                <Tag color={item.is_mandatory ? 'red' : 'blue'}>
                                    {item.requirement_type}
                                </Tag>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Important Dates */}
            <div className="tender-dates">
                <h4>📅 IMPORTANT DATES</h4>
                <div className="dates-grid">
                    <div className="date-item">
                        <span className="date-label">Published:</span>
                        <span className="date-value">{tenderData?.published_date}</span>
                    </div>
                    <div className="date-item">
                        <span className="date-label">Submission Deadline:</span>
                        <span className="date-value important">{tenderData?.submission_deadline}</span>
                    </div>
                    <div className="date-item">
                        <span className="date-label">Opening Date:</span>
                        <span className="date-value">{tenderData?.opening_date}</span>
                    </div>
                    <div className="date-item">
                        <span className="date-label">Evaluation Target:</span>
                        <span className="date-value">{tenderData?.evaluation_completion_target}</span>
                    </div>
                </div>
            </div>

            {/* Evaluation Criteria - No Financial Weightage */}
            <div className="evaluation-criteria">
                <h4>📊 EVALUATION CRITERIA</h4>
                <div className="criteria-list">
                    <div className="criterion">
                        <span className="criterion-name">Technical Compliance</span>
                        <span className="criterion-weight">40%</span>
                    </div>
                    <div className="criterion">
                        <span className="criterion-name">Delivery Timeline</span>
                        <span className="criterion-weight">30%</span>
                    </div>
                    <div className="criterion">
                        <span className="criterion-name">Vendor Experience</span>
                        <span className="criterion-weight">20%</span>
                    </div>
                    <div className="criterion">
                        <span className="criterion-name">After-Sales Support</span>
                        <span className="criterion-weight">10%</span>
                    </div>
                </div>
                
                <Alert 
                    message="Evaluation Notice" 
                    description="Financial evaluation will be conducted separately by authorized committee. Technical compliance and delivery capability are primary considerations."
                    type="info" 
                    showIcon 
                    style={{marginTop: 12}}
                />
            </div>

            {/* Contact Information */}
            <div className="contact-info">
                <h4>📞 CONTACT INFORMATION</h4>
                <p><strong>Procurement Office</strong></p>
                <p>📧 Email: procurement@organization.gov</p>
                <p>📞 Phone: +92-51-1234567</p>
                <p>🏢 Address: Central Procurement Office, Government Complex</p>
            </div>

            {/* Important Notice */}
            <Alert 
                message="Important Notice" 
                description="This tender focuses on technical specifications and delivery capabilities. Financial evaluation is conducted confidentially by authorized personnel as per organizational policy."
                type="warning" 
                showIcon 
                style={{marginTop: 16}}
            />
        </Card>
    );
};

// ====================================================================
// 📊 4. BID STATUS DISPLAY (NO PRICING)
// ====================================================================

const PublicBidStatusDisplay = ({ tenderId }) => {
    const [bids, setBids] = useState([]);

    return (
        <Card title="📊 Bid Evaluation Status" className="bid-status-display">
            <div className="evaluation-summary">
                <h4>📈 Evaluation Progress</h4>
                <Progress percent={75} status="active" />
                <p>Technical evaluation in progress. Expected completion: October 4, 2025</p>
            </div>

            {/* Qualified Vendors - No Price Information */}
            <div className="qualified-vendors">
                <h4>🏢 Qualified Vendors</h4>
                {bids.filter(bid => bid.is_technically_compliant).map((bid, index) => (
                    <Card key={index} size="small" style={{marginBottom: 12}}>
                        <div className="vendor-info">
                            <h5>{bid.vendor_name}</h5>
                            <div className="vendor-details">
                                <p><strong>Registration:</strong> {bid.vendor_code}</p>
                                <p><strong>Contact:</strong> {bid.contact_person}</p>
                                <p><strong>Bid Reference:</strong> {bid.bid_reference}</p>
                            </div>

                            <div className="technical-compliance">
                                <h6>✅ Technical Evaluation</h6>
                                <Tag color="green">QUALIFIED</Tag>
                                <Progress 
                                    percent={bid.technical_evaluation_score} 
                                    size="small" 
                                    style={{marginTop: 8}}
                                />
                            </div>

                            <div className="delivery-promise">
                                <h6>🚚 Delivery Commitment</h6>
                                <p>Promised delivery: {bid.delivery_time_days} working days</p>
                            </div>

                            <div className="warranty-offered">
                                <h6>🛡️ Warranty</h6>
                                <p>Warranty period: {bid.warranty_months} months</p>
                            </div>

                            <div className="vendor-status">
                                <Tag color={getBidStatusColor(bid.bid_status)}>
                                    {bid.status_description}
                                </Tag>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Disqualified Vendors */}
            <div className="disqualified-vendors">
                <h4>❌ Disqualified Vendors</h4>
                {bids.filter(bid => !bid.is_technically_compliant).map((bid, index) => (
                    <Card key={index} size="small" style={{marginBottom: 8, opacity: 0.7}}>
                        <div className="vendor-info">
                            <h6>{bid.vendor_name}</h6>
                            <Tag color="red">DISQUALIFIED</Tag>
                            <p><small>Reason: {bid.disqualification_reason}</small></p>
                        </div>
                    </Card>
                ))}
            </div>

            <Alert 
                message="Financial Evaluation" 
                description="Price evaluation is conducted separately by authorized procurement committee. Public display focuses on technical qualifications and delivery capabilities."
                type="info" 
                showIcon 
            />
        </Card>
    );
};

// ====================================================================
// 🏆 5. AWARD NOTIFICATION (NO AMOUNT)
// ====================================================================

const AwardNotificationPublic = ({ tenderId }) => {
    const [awardData, setAwardData] = useState(null);

    return (
        <Card className="award-notification">
            <div className="award-header">
                <h2>🏆 TENDER AWARD NOTIFICATION</h2>
                <Tag color="success" style={{fontSize: '14px', padding: '4px 12px'}}>
                    CONTRACT AWARDED
                </Tag>
            </div>

            <div className="award-details">
                <h4>📋 Tender Information</h4>
                <p><strong>Tender:</strong> {awardData?.tender_title}</p>
                <p><strong>Reference:</strong> {awardData?.tender_code}</p>
                <p><strong>Award Date:</strong> {awardData?.award_date}</p>
            </div>

            <div className="winning-vendor">
                <h4>🏆 AWARDED TO</h4>
                <Card size="small" style={{backgroundColor: '#f6ffed', border: '1px solid #b7eb8f'}}>
                    <h5>{awardData?.awarded_vendor_name}</h5>
                    <p><strong>Registration:</strong> {awardData?.vendor_registration}</p>
                    <p><strong>Contact Person:</strong> {awardData?.vendor_contact}</p>
                </Card>
            </div>

            <div className="awarded-items">
                <h4>📦 Awarded Items</h4>
                <div className="items-list">
                    <p><strong>Product:</strong> {awardData?.awarded_product}</p>
                    <p><strong>Quantity:</strong> {awardData?.awarded_quantity} units</p>
                    <p><strong>Delivery Timeline:</strong> {awardData?.delivery_days} working days</p>
                    <p><strong>Warranty:</strong> {awardData?.warranty_months} months comprehensive</p>
                </div>
            </div>

            <div className="selection-criteria">
                <h4>🎯 Selection Criteria Met</h4>
                <div className="criteria-met">
                    <p>✅ Full Technical Compliance</p>
                    <p>✅ Best Delivery Schedule</p>
                    <p>✅ Extended Warranty Period</p>
                    <p>✅ Strong After-Sales Support</p>
                    <p>✅ Excellent Past Performance</p>
                </div>
            </div>

            <div className="next-steps">
                <h4>📅 Next Steps</h4>
                <p><strong>Contract Signing:</strong> {awardData?.contract_date}</p>
                <p><strong>Expected Delivery:</strong> {awardData?.expected_delivery_date}</p>
            </div>

            <Alert 
                message="Contract Value" 
                description="Contract financial details are maintained confidentially as per organizational procurement policy. Public notification focuses on technical and delivery aspects."
                type="info" 
                showIcon 
                style={{marginTop: 16}}
            />
        </Card>
    );
};

// ====================================================================
// 🎨 6. HELPER FUNCTIONS
// ====================================================================

const getPriorityColor = (priority) => {
    switch(priority) {
        case 'LOW': return 'green';
        case 'NORMAL': return 'blue';
        case 'HIGH': return 'orange';
        case 'URGENT': return 'red';
        default: return 'default';
    }
};

const getBidStatusColor = (status) => {
    switch(status) {
        case 'QUALIFIED': return 'green';
        case 'UNDER_EVALUATION': return 'blue';
        case 'DISQUALIFIED': return 'red';
        case 'AWARDED': return 'gold';
        default: return 'default';
    }
};

const fetchStockData = async (itemId) => {
    // Fetch current stock data without financial information
    // This would call the backend API with user access control
};

const fetchRequestData = async (requestId, userRole) => {
    // Fetch request data based on user's access level
    // Public users get quantity-focused data only
};

// ====================================================================
// 📱 7. CSS STYLES FOR QUANTITY-FOCUSED UI
// ====================================================================

const styles = `
.request-form {
    max-width: 800px;
    margin: 0 auto;
}

.form-section {
    margin-bottom: 24px;
    padding: 16px;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
}

.stock-analysis-card {
    background-color: #fafafa;
    border-left: 4px solid #1890ff;
}

.stock-info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
}

.stock-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: white;
    border-radius: 4px;
}

.stock-item .label {
    font-weight: 500;
    color: #666;
}

.stock-item .value.critical {
    color: #ff4d4f;
    font-weight: bold;
}

.stock-item .value.normal {
    color: #52c41a;
}

.approval-dashboard .item-analysis {
    padding: 16px;
}

.stock-metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
    margin: 16px 0;
}

.metric {
    display: flex;
    flex-direction: column;
    padding: 8px;
    background: #fafafa;
    border-radius: 4px;
}

.metric-label {
    font-size: 12px;
    color: #666;
    margin-bottom: 4px;
}

.metric-value {
    font-weight: 500;
}

.metric-value.critical {
    color: #ff4d4f;
}

.metric-value.success {
    color: #52c41a;
}

.tender-notice {
    max-width: 900px;
    margin: 0 auto;
}

.tender-header {
    text-align: center;
    margin-bottom: 24px;
    padding: 16px;
    background: linear-gradient(135deg, #1890ff, #722ed1);
    color: white;
    border-radius: 6px;
}

.dates-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
}

.date-item {
    display: flex;
    flex-direction: column;
    padding: 12px;
    background: #fafafa;
    border-radius: 4px;
}

.date-label {
    font-size: 12px;
    color: #666;
    margin-bottom: 4px;
}

.date-value {
    font-weight: 500;
}

.date-value.important {
    color: #ff4d4f;
    font-weight: bold;
}

.criteria-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 12px;
}

.criterion {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #f6ffed;
    border: 1px solid #d9f7be;
    border-radius: 4px;
}

.vendor-info {
    padding: 12px;
}

.technical-compliance, .delivery-promise, .warranty-offered {
    margin-top: 12px;
    padding-top: 8px;
    border-top: 1px solid #f0f0f0;
}

/* Hide any financial elements that might accidentally appear */
.financial-data,
.cost-info,
.price-data,
.budget-info {
    display: none !important;
}
`;

export {
    QuantityFocusedRequestForm,
    QuantityFocusedApprovalDashboard,
    PublicTenderNotice,
    PublicBidStatusDisplay,
    AwardNotificationPublic,
    styles
};

// ====================================================================
// 📚 USAGE EXAMPLE
// ====================================================================

/*
// In your main App component:

import {
    QuantityFocusedRequestForm,
    QuantityFocusedApprovalDashboard,
    PublicTenderNotice,
    styles
} from './QuantityFocusedComponents';

function App() {
    return (
        <div>
            <style>{styles}</style>
            
            {/* For DEC users creating requests */}
            <QuantityFocusedRequestForm />
            
            {/* For approvers reviewing requests */}
            <QuantityFocusedApprovalDashboard 
                requestId="req-001" 
                userRole="DG_ADMIN" 
            />
            
            {/* For public tender display */}
            <PublicTenderNotice tenderId="tender-001" />
        </div>
    );
}
*/
