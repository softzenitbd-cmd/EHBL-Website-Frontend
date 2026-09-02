import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Users, Calendar, DollarSign, Award, Plus, Check, X, Eye, Printer, Download, FileText, Filter, RotateCcw, Clock, ShieldCheck, Edit } from 'lucide-react';
import useStore from '../store/useStore';
import { downloadAsPDF } from '../utils/pdfGenerator';
import InvoiceHeader from '../components/InvoiceHeader';
import PrintFooter from '../components/PrintFooter';

const HR = () => {
  const [activeTab, setActiveTab] = useState('Staff');
  const [attendanceSubTab, setAttendanceSubTab] = useState('daily'); // 'daily' or 'history'
  
  const { 
    staff = [], 
    attendance = [], 
    leaves = [], 
    payrolls = [], 
    addStaff,
    updateStaff, 
    markAttendance, 
    addLeaveRequest, 
    updateLeaveStatus, 
    generatePayslip,
    showToast
  } = useStore();

  const safeStaff = Array.isArray(staff) ? staff : [];
  const safeAttendance = Array.isArray(attendance) ? attendance : [];
  const safeLeaves = Array.isArray(leaves) ? leaves : [];
  const safePayrolls = Array.isArray(payrolls) ? payrolls : [];

  // Modals state
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', role: 'Salesman', baseSalary: '', phone: '', address: '', bankAccount: '', username: '', password: '' });

  const [showEditStaffModal, setShowEditStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState({ id: '', name: '', role: 'Salesman', baseSalary: '', phone: '', address: '', bankAccount: '', username: '', password: '' });

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const action = searchParams.get('action');
    if (action === 'add') {
      setActiveTab('Staff');
      setShowAddStaffModal(true);
    } else if (action === 'attendance') {
      setActiveTab('Attendance');
    } else if (action === 'leave') {
      setActiveTab('Leave');
    } else if (action === 'payroll') {
      setActiveTab('Payroll');
    } else if (action === 'list' || !action) {
      if (!action && activeTab === 'Staff') {
        setShowAddStaffModal(false);
      }
    }
  }, [location.search]);

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];
  const [newLeave, setNewLeave] = useState({ staffId: '', type: 'Casual', reason: '', startDate: todayStr, endDate: todayStr });

  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedStaffAttendanceLog, setSelectedStaffAttendanceLog] = useState(null);

  // Bonus state for payroll
  const [bonuses, setBonuses] = useState({});

  // Dates & Filters
  const [attDate, setAttDate] = useState(todayStr);
  
  // Attendance History Filters
  const [filterStaffId, setFilterStaffId] = useState('All');
  const [filterMode, setFilterMode] = useState('month'); // 'month' or 'custom'
  const [historyMonth, setHistoryMonth] = useState(todayStr.substring(0, 7)); // YYYY-MM
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('All'); // 'All', 'Present', 'Absent', 'Late', 'Leave'
  const [historyViewType, setHistoryViewType] = useState('summary'); // 'summary' or 'detailed_logs'

  // Payroll Month
  const [payrollMonth, setPayrollMonth] = useState(todayStr.substring(0, 7)); // YYYY-MM

  // Handlers
  const handleEditStaffClick = (staffMember) => {
    setEditingStaff({ ...staffMember });
    setShowEditStaffModal(true);
  };

  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    if (!editingStaff.name) { showToast('Name is required', 'error'); return; }
    await updateStaff(editingStaff.id, {
      ...editingStaff,
      baseSalary: parseFloat(editingStaff.baseSalary) || 0
    });
    showToast('Staff updated successfully!', 'success');
    setShowEditStaffModal(false);
  };
  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!newStaff.name) { showToast('Name is required', 'error'); return; }
    await addStaff({
      ...newStaff,
      baseSalary: parseFloat(newStaff.baseSalary) || 0,
      joinDate: todayStr
    });
    setShowAddStaffModal(false);
    setNewStaff({ name: '', role: 'Salesman', baseSalary: '', phone: '', address: '', bankAccount: '', username: '', password: '' });
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!newLeave.staffId) { showToast('Please select a staff member', 'error'); return; }
    if (newLeave.endDate < newLeave.startDate) {
      { showToast('End Date cannot be earlier than Start Date.', 'error'); return; }
    }
    await addLeaveRequest({
      ...newLeave,
      date: newLeave.startDate
    });
    setShowLeaveModal(false);
    setNewLeave({ staffId: '', type: 'Casual', reason: '', startDate: todayStr, endDate: todayStr });
  };

  const handleGeneratePayslip = async (staffMember, presentDays, bonus) => {
    const dailyRate = Number(staffMember.baseSalary || 0) / 30;
    const netPay = Math.round((dailyRate * presentDays) + bonus);

    const alreadyPaid = safePayrolls.some(p => String(p.staffId || p.staff_id || p.staff) === String(staffMember.id) && p.month === payrollMonth);
    if (alreadyPaid) { showToast('Payslip already generated for this month!', 'error'); return; }

    await generatePayslip({
      month: payrollMonth,
      year: payrollMonth.split('-')[0],
      staffId: staffMember.id,
      staffName: staffMember.name,
      presentDays,
      baseSalary: Number(staffMember.baseSalary || 0),
      bonus,
      netPay
    });
    showToast(`Payslip generated for ${staffMember.name}. Amount: ৳${netPay.toLocaleString()}`, 'success');
  };

  const handleResetAttendanceFilters = () => {
    setFilterStaffId('All');
    setFilterMode('month');
    setHistoryMonth(todayStr.substring(0, 7));
    setStartDate('');
    setEndDate('');
    setFilterStatus('All');
  };

  // Filter Attendance Logs safely
  const filteredAttendanceLogs = safeAttendance.filter(a => {
    if (!a) return false;

    // 1. Staff Filter
    if (filterStaffId !== 'All') {
      const matchStaff = String(a.staffId || a.staff_id || a.staff || '') === String(filterStaffId);
      if (!matchStaff) return false;
    }

    // 2. Status Filter
    if (filterStatus !== 'All') {
      if (a.status !== filterStatus) return false;
    }

    // 3. Date / Month Filter
    const aDate = String(a.date || '').split('T')[0];
    if (filterMode === 'month') {
      if (historyMonth && !aDate.startsWith(historyMonth)) return false;
    } else if (filterMode === 'custom') {
      if (startDate && aDate < startDate) return false;
      if (endDate && aDate > endDate) return false;
    }

    return true;
  });

  // Calculate Summary for Each Staff Member based on the active Date/Month filters
  const staffToDisplay = filterStaffId === 'All' ? safeStaff : safeStaff.filter(s => String(s.id) === String(filterStaffId));

  const monthlyAttendanceSummary = staffToDisplay.map(s => {
    const staffRecords = filteredAttendanceLogs.filter(a => String(a.staffId || a.staff_id || a.staff || '') === String(s.id));
    const presentCount = staffRecords.filter(a => a.status === 'Present').length;
    const absentCount = staffRecords.filter(a => a.status === 'Absent').length;
    const lateCount = staffRecords.filter(a => a.status === 'Late').length;
    const leaveCount = staffRecords.filter(a => a.status === 'Leave').length;
    const totalMarked = staffRecords.length;
    const rate = totalMarked > 0 ? Math.round(((presentCount + lateCount) / totalMarked) * 100) : 0;

    return {
      staff: s,
      records: staffRecords.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
      presentCount,
      absentCount,
      lateCount,
      leaveCount,
      totalMarked,
      rate
    };
  });

  const totalPresentSum = monthlyAttendanceSummary.reduce((acc, s) => acc + s.presentCount, 0);
  const totalAbsentSum = monthlyAttendanceSummary.reduce((acc, s) => acc + s.absentCount, 0);
  const totalLateSum = monthlyAttendanceSummary.reduce((acc, s) => acc + s.lateCount, 0);
  const totalLeaveSum = monthlyAttendanceSummary.reduce((acc, s) => acc + s.leaveCount, 0);

  return (
    <div className="hr-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1>HR & Payroll Management</h1>
          <p className="text-muted">Manage staff, attendance history, leave requests, salary, and bonuses.</p>
        </div>
        {activeTab === 'Staff' && (
          <button className="btn-primary flex-align-gap" onClick={() => setShowAddStaffModal(true)}>
            <Plus size={18} /> Add Staff
          </button>
        )}
        {activeTab === 'Leave' && (
          <button className="btn-primary flex-align-gap" onClick={() => setShowLeaveModal(true)}>
            <Plus size={18} /> Apply Leave
          </button>
        )}
      </div>

      <div className="card glass">
        {/* Navigation Tabs */}
        <div className="type-toggle-container mb-4">
          <div className="type-toggle">
            <button className={`type-btn ${activeTab === 'Staff' ? 'active' : ''}`} onClick={() => setActiveTab('Staff')}>
              <Users size={18} className="inline-block mr-2" /> Staff List ({safeStaff.length})
            </button>
            <button className={`type-btn ${activeTab === 'Attendance' ? 'active' : ''}`} onClick={() => setActiveTab('Attendance')}>
              <Calendar size={18} className="inline-block mr-2" /> Attendance & History ({safeAttendance.length})
            </button>
            <button className={`type-btn ${activeTab === 'Leave' ? 'active' : ''}`} onClick={() => setActiveTab('Leave')}>
              <FileText size={18} className="inline-block mr-2" /> Leave Requests ({safeLeaves.length})
            </button>
            <button className={`type-btn ${activeTab === 'Payroll' ? 'active' : ''}`} onClick={() => setActiveTab('Payroll')}>
              <DollarSign size={18} className="inline-block mr-2" /> Payroll & Bonus
            </button>
          </div>
        </div>

        {/* TAB 1: STAFF LIST */}
        {activeTab === 'Staff' && (
          <div>
            <h3>Employee Directory</h3>
            {safeStaff.length === 0 ? <div className="text-center text-muted py-8">No staff registered yet.</div> : (
              <div className="table-responsive">
                <table className="data-table mt-4">
                  <thead>
                    <tr>
                      <th>Staff ID</th>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Base Salary</th>
                      <th>Phone</th>
                      <th>Join Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeStaff.map(s => (
                      <tr key={s.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{s.id}</td>
                        <td className="font-bold">{s.name}</td>
                        <td><span className="badge primary">{s.role}</span></td>
                        <td>{Number(s.baseSalary || 0).toLocaleString()}</td>
                        <td>{s.phone || '-'}</td>
                        <td>{s.joinDate || s.created_at?.split('T')[0] || '-'}</td>
                        <td>
                          <div className="flex-align-gap">
                            <button type="button" className="btn-icon" title="Edit Profile" onClick={(e) => { e.stopPropagation(); handleEditStaffClick(s); }}>
                              <Edit size={16} color="var(--primary)" />
                            </button>
                            <button className="btn-icon" title="View Profile" onClick={() => setSelectedStaff(s)}>
                              <Eye size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ATTENDANCE & COMPREHENSIVE HISTORY */}
        {activeTab === 'Attendance' && (
          <div>
            {/* Top Sub-Switch */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  type="button" 
                  className={`btn-outline ${attendanceSubTab === 'daily' ? 'active' : ''}`}
                  style={{ background: attendanceSubTab === 'daily' ? 'var(--primary)' : 'transparent', color: attendanceSubTab === 'daily' ? '#fff' : 'inherit' }}
                  onClick={() => setAttendanceSubTab('daily')}
                >
                  📅 Mark Daily Attendance
                </button>
                <button 
                  type="button" 
                  className={`btn-outline ${attendanceSubTab === 'history' ? 'active' : ''}`}
                  style={{ background: attendanceSubTab === 'history' ? 'var(--primary)' : 'transparent', color: attendanceSubTab === 'history' ? '#fff' : 'inherit' }}
                  onClick={() => setAttendanceSubTab('history')}
                >
                  📊 Attendance History & Breakdown
                </button>
              </div>

              {attendanceSubTab === 'daily' ? (
                <div className="flex-align-gap">
                  <span className="text-sm font-bold text-muted">Attendance Date:</span>
                  <input
                    type="date"
                    className="p-2 bg-input border border-gray-700 rounded text-main font-bold"
                    value={attDate}
                    onChange={(e) => setAttDate(e.target.value)}
                  />
                </div>
              ) : (
                <div className="flex-align-gap">
                  <button 
                    type="button" 
                    className="btn-primary flex-align-gap" 
                    style={{ fontSize: '0.85rem' }}
                    onClick={() => {
                      const printContents = document.getElementById('printable-monthly-attendance').innerHTML;
                      const originalContents = document.body.innerHTML;
                      document.body.innerHTML = '<div id="print-wrapper">' + printContents + '</div>';
                      window.print();
                      document.body.innerHTML = originalContents;
                      window.location.reload(); 
                    }}
                  >
                    <Printer size={16} /> Print Attendance Sheet
                  </button>
                </div>
              )}
            </div>

            {/* VIEW A: DAILY ATTENDANCE MARKING */}
            {attendanceSubTab === 'daily' && (
              <div>
                <h3 className="mb-2">Mark Daily Attendance: <span className="text-primary">{attDate}</span></h3>
                <p className="text-muted text-sm mb-4">Select status for each employee. Saved automatically to the backend.</p>
                
                {safeStaff.length === 0 ? <p className="text-muted py-6 text-center">No staff found. Please add staff first.</p> : (
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Staff ID</th>
                          <th>Employee Name</th>
                          <th>Role</th>
                          <th>Attendance Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {safeStaff.map(s => {
                          const existingAtt = safeAttendance.find(a => (String(a.staffId || a.staff_id || a.staff) === String(s.id)) && String(a.date || '').split('T')[0] === attDate);
                          const status = existingAtt ? existingAtt.status : '';
                          return (
                            <tr key={s.id}>
                              <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{s.id}</td>
                              <td className="font-bold">{s.name}</td>
                              <td><span className="badge primary">{s.role}</span></td>
                              <td>
                                <select
                                  className="p-2 bg-input border border-gray-700 rounded font-bold"
                                  style={{ minWidth: '150px' }}
                                  value={status}
                                  onChange={(e) => markAttendance(s.id, attDate, e.target.value)}
                                >
                                  <option value="" disabled>Mark Status</option>
                                  <option value="Present">🟢 Present</option>
                                  <option value="Absent">🔴 Absent</option>
                                  <option value="Late">🟡 Late</option>
                                  <option value="Leave">🔵 On Leave</option>
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* VIEW B: COMPREHENSIVE ATTENDANCE HISTORY & FILTERING */}
            {attendanceSubTab === 'history' && (
              <div>
                {/* Advanced Multi-Filter Toolbar */}
                <div className="card glass mb-4" style={{ padding: '1.25rem', background: 'var(--bg-hover)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                    
                    {/* 1. Employee Filter */}
                    <div>
                      <label className="text-xs font-bold text-muted block mb-1">👤 Select Employee:</label>
                      <select 
                        className="w-full" 
                        value={filterStaffId} 
                        onChange={(e) => setFilterStaffId(e.target.value)}
                        style={{ padding: '0.55rem', borderRadius: '8px', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                      >
                        <option value="All">👥 All Employees ({safeStaff.length})</option>
                        {safeStaff.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                        ))}
                      </select>
                    </div>

                    {/* 2. Filter Mode (Month vs Custom Date Range) */}
                    <div>
                      <label className="text-xs font-bold text-muted block mb-1">📅 Filter Mode:</label>
                      <select 
                        className="w-full" 
                        value={filterMode} 
                        onChange={(e) => setFilterMode(e.target.value)}
                        style={{ padding: '0.55rem', borderRadius: '8px', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                      >
                        <option value="month">🗓️ Month-wise Filter</option>
                        <option value="custom">📆 Custom Date Range (Start/End)</option>
                      </select>
                    </div>

                    {/* 3. Month Picker OR Date Range Pickers */}
                    {filterMode === 'month' ? (
                      <div>
                        <label className="text-xs font-bold text-muted block mb-1">🗓️ Select Month:</label>
                        <input 
                          type="month" 
                          className="w-full" 
                          value={historyMonth} 
                          onChange={(e) => setHistoryMonth(e.target.value)}
                          style={{ padding: '0.5rem', borderRadius: '8px', background: 'var(--bg-card)', color: 'var(--text-main)', fontWeight: 'bold' }}
                        />
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="text-xs font-bold text-muted block mb-1">📅 Start Date:</label>
                          <input 
                            type="date" 
                            className="w-full" 
                            value={startDate} 
                            onChange={(e) => setStartDate(e.target.value)}
                            style={{ padding: '0.5rem', borderRadius: '8px', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-muted block mb-1">📅 End Date:</label>
                          <input 
                            type="date" 
                            className="w-full" 
                            value={endDate} 
                            onChange={(e) => setEndDate(e.target.value)}
                            style={{ padding: '0.5rem', borderRadius: '8px', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                          />
                        </div>
                      </>
                    )}

                    {/* 4. Status Filter */}
                    <div>
                      <label className="text-xs font-bold text-muted block mb-1">🏷️ Status Filter:</label>
                      <select 
                        className="w-full" 
                        value={filterStatus} 
                        onChange={(e) => setFilterStatus(e.target.value)}
                        style={{ padding: '0.55rem', borderRadius: '8px', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                      >
                        <option value="All">All Statuses</option>
                        <option value="Present">🟢 Present</option>
                        <option value="Absent">🔴 Absent</option>
                        <option value="Late">🟡 Late</option>
                        <option value="Leave">🔵 On Leave</option>
                      </select>
                    </div>

                  </div>

                  {/* Reset Filters & View Type Switcher */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        type="button" 
                        className={`btn-outline ${historyViewType === 'summary' ? 'active' : ''}`}
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                        onClick={() => setHistoryViewType('summary')}
                      >
                        📊 Employee Summary View
                      </button>
                      <button 
                        type="button" 
                        className={`btn-outline ${historyViewType === 'detailed_logs' ? 'active' : ''}`}
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                        onClick={() => setHistoryViewType('detailed_logs')}
                      >
                        📜 Date-wise Detailed Log List ({filteredAttendanceLogs.length})
                      </button>
                    </div>

                    <button 
                      type="button" 
                      className="btn-outline flex-align-gap" 
                      style={{ color: 'var(--danger)', borderColor: 'var(--danger)', padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                      onClick={handleResetAttendanceFilters}
                    >
                      <RotateCcw size={14} /> Reset Filters
                    </button>
                  </div>
                </div>

                {/* KPI Metrics Banner */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="card glass text-center" style={{ padding: '0.85rem' }}>
                    <div className="text-muted text-xs font-bold uppercase">Staff Selected</div>
                    <div className="text-2xl font-bold text-primary">{staffToDisplay.length}</div>
                  </div>
                  <div className="card glass text-center" style={{ padding: '0.85rem' }}>
                    <div className="text-muted text-xs font-bold uppercase">🟢 Total Present</div>
                    <div className="text-2xl font-bold text-success">{totalPresentSum}</div>
                  </div>
                  <div className="card glass text-center" style={{ padding: '0.85rem' }}>
                    <div className="text-muted text-xs font-bold uppercase">🔴 Total Absent</div>
                    <div className="text-2xl font-bold text-danger">{totalAbsentSum}</div>
                  </div>
                  <div className="card glass text-center" style={{ padding: '0.85rem' }}>
                    <div className="text-muted text-xs font-bold uppercase">🟡 Total Late</div>
                    <div className="text-2xl font-bold text-warning">{totalLateSum}</div>
                  </div>
                  <div className="card glass text-center" style={{ padding: '0.85rem' }}>
                    <div className="text-muted text-xs font-bold uppercase">🔵 On Leave</div>
                    <div className="text-2xl font-bold text-info">{totalLeaveSum}</div>
                  </div>
                </div>

                {/* VIEW 1: SUMMARY BY EMPLOYEE */}
                {historyViewType === 'summary' && (
                  <div>
                    <h3 className="mb-2">Attendance Summary by Employee</h3>
                    <p className="text-muted text-sm mb-4">Showing total counts based on active filter. Click "View Date Log (👁️)" to see exact dates.</p>

                    <div className="table-responsive">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Staff ID</th>
                            <th>Name</th>
                            <th>Role</th>
                            <th style={{ textAlign: 'center' }}>🟢 Present</th>
                            <th style={{ textAlign: 'center' }}>🔴 Absent</th>
                            <th style={{ textAlign: 'center' }}>🟡 Late</th>
                            <th style={{ textAlign: 'center' }}>🔵 Leave</th>
                            <th style={{ textAlign: 'center' }}>Present Rate</th>
                            <th style={{ textAlign: 'center' }}>Exact Dates Log</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthlyAttendanceSummary.map((sum) => (
                            <tr key={sum.staff.id}>
                              <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{sum.staff.id}</td>
                              <td className="font-bold">{sum.staff.name}</td>
                              <td><span className="badge primary">{sum.staff.role}</span></td>
                              <td style={{ textAlign: 'center', fontWeight: 'bold' }} className="text-success">{sum.presentCount} days</td>
                              <td style={{ textAlign: 'center', fontWeight: 'bold' }} className="text-danger">{sum.absentCount} days</td>
                              <td style={{ textAlign: 'center', fontWeight: 'bold' }} className="text-warning">{sum.lateCount} days</td>
                              <td style={{ textAlign: 'center', fontWeight: 'bold' }} className="text-info">{sum.leaveCount} days</td>
                              <td style={{ textAlign: 'center' }}>
                                <span className={`badge ${sum.rate >= 80 ? 'success' : sum.rate >= 50 ? 'warning' : 'danger'}`}>
                                  {sum.rate}%
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button 
                                  type="button" 
                                  className="btn-outline flex-align-gap" 
                                  style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem', margin: 'auto' }}
                                  onClick={() => setSelectedStaffAttendanceLog(sum)}
                                >
                                  <Eye size={14} /> View Date Log ({sum.records.length})
                                </button>
                              </td>
                            </tr>
                          ))}
                          {monthlyAttendanceSummary.length === 0 && (
                            <tr>
                              <td colSpan="9" className="text-center text-muted py-6">No employee records match the filter.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* VIEW 2: DETAILED DATE-BY-DATE LOG LIST */}
                {historyViewType === 'detailed_logs' && (
                  <div>
                    <h3 className="mb-2">Date-by-Date Attendance Logs ({filteredAttendanceLogs.length} Records)</h3>
                    <p className="text-muted text-sm mb-4">Showing every individual attendance record sorted chronologically.</p>

                    <div className="table-responsive">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Staff ID</th>
                            <th>Employee Name</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Logged At</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAttendanceLogs.map((log, idx) => {
                            const staffMember = safeStaff.find(s => String(s.id) === String(log.staffId || log.staff_id || log.staff));
                            return (
                              <tr key={idx}>
                                <td style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{log.date}</td>
                                <td style={{ fontFamily: 'monospace' }}>{staffMember ? staffMember.id : (log.staffId || log.staff_id || '-')}</td>
                                <td className="font-bold">{staffMember ? staffMember.name : (log.staffName || 'Unknown')}</td>
                                <td><span className="badge primary">{staffMember ? staffMember.role : '-'}</span></td>
                                <td>
                                  <span className={`badge ${log.status === 'Present' ? 'success' : log.status === 'Absent' ? 'danger' : log.status === 'Late' ? 'warning' : 'info'}`}>
                                    {log.status === 'Present' && '🟢 Present'}
                                    {log.status === 'Absent' && '🔴 Absent'}
                                    {log.status === 'Late' && '🟡 Late'}
                                    {log.status === 'Leave' && '🔵 On Leave'}
                                  </span>
                                </td>
                                <td className="text-muted text-xs">
                                  {log.marked_at ? new Date(log.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Logged'}
                                </td>
                              </tr>
                            );
                          })}
                          {filteredAttendanceLogs.length === 0 && (
                            <tr>
                              <td colSpan="6" className="text-center text-muted py-6">No attendance records found for the selected filters.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Printable Monthly Attendance Sheet (Hidden) */}
                <div id="printable-monthly-attendance" className="printable-only" style={{ display: 'none' }}>
                  <div style={{ padding: '1.5rem', background: '#fff', color: '#000' }}>
                    <InvoiceHeader />
                    <h2 style={{ textAlign: 'center', margin: '1rem 0' }}>STAFF ATTENDANCE REPORT</h2>
                    <p style={{ textAlign: 'center', color: '#555', marginBottom: '1.5rem' }}>
                      Period: {filterMode === 'month' ? `Month: ${historyMonth}` : `From: ${startDate || 'Start'} To: ${endDate || 'End'}`} | Generated Date: {new Date().toLocaleDateString()}
                    </p>
                    
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                      <thead>
                        <tr style={{ background: '#f8f9fa' }}>
                          <th style={{ border: '1px solid #ccc', padding: '0.5rem', textAlign: 'left' }}>Staff ID</th>
                          <th style={{ border: '1px solid #ccc', padding: '0.5rem', textAlign: 'left' }}>Staff Name</th>
                          <th style={{ border: '1px solid #ccc', padding: '0.5rem', textAlign: 'left' }}>Role</th>
                          <th style={{ border: '1px solid #ccc', padding: '0.5rem', textAlign: 'center' }}>Present (Days)</th>
                          <th style={{ border: '1px solid #ccc', padding: '0.5rem', textAlign: 'center' }}>Absent (Days)</th>
                          <th style={{ border: '1px solid #ccc', padding: '0.5rem', textAlign: 'center' }}>Late (Days)</th>
                          <th style={{ border: '1px solid #ccc', padding: '0.5rem', textAlign: 'center' }}>Leave (Days)</th>
                          <th style={{ border: '1px solid #ccc', padding: '0.5rem', textAlign: 'center' }}>Present Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyAttendanceSummary.map((sum, idx) => (
                          <tr key={idx}>
                            <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{sum.staff.id}</td>
                            <td style={{ border: '1px solid #ccc', padding: '0.5rem', fontWeight: 'bold' }}>{sum.staff.name}</td>
                            <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{sum.staff.role}</td>
                            <td style={{ border: '1px solid #ccc', padding: '0.5rem', textAlign: 'center', fontWeight: 'bold' }}>{sum.presentCount}</td>
                            <td style={{ border: '1px solid #ccc', padding: '0.5rem', textAlign: 'center' }}>{sum.absentCount}</td>
                            <td style={{ border: '1px solid #ccc', padding: '0.5rem', textAlign: 'center' }}>{sum.lateCount}</td>
                            <td style={{ border: '1px solid #ccc', padding: '0.5rem', textAlign: 'center' }}>{sum.leaveCount}</td>
                            <td style={{ border: '1px solid #ccc', padding: '0.5rem', textAlign: 'center', fontWeight: 'bold' }}>{sum.rate}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <PrintFooter />
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

        {/* TAB 3: LEAVE REQUESTS */}
        {activeTab === 'Leave' && (
          <div>
            <h3>Leave Requests</h3>
            {safeLeaves.length === 0 ? <div className="text-center text-muted py-8">No leave requests recorded.</div> : (
              <div className="table-responsive">
                <table className="data-table mt-4">
                  <thead>
                    <tr>
                      <th>Leave Duration</th>
                      <th>Total Days</th>
                      <th>Staff Name</th>
                      <th>Leave Type</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeLeaves.map(l => {
                      const staffMember = safeStaff.find(s => String(s.id) === String(l.staffId || l.staff_id));
                      const sDate = l.startDate || l.start_date || l.date;
                      const eDate = l.endDate || l.end_date || sDate;
                      let days = l.daysCount || l.days_count;
                      if (!days && sDate && eDate) {
                        try {
                          const diff = (new Date(eDate) - new Date(sDate)) / (1000 * 60 * 60 * 24);
                          days = Math.max(1, Math.round(diff) + 1);
                        } catch { days = 1; }
                      }

                      return (
                        <tr key={l.id}>
                          <td style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                            {sDate === eDate ? sDate : `${sDate} ➔ ${eDate}`}
                          </td>
                          <td>
                            <span className="badge warning">{days || 1} Day(s)</span>
                          </td>
                          <td className="font-bold">{staffMember ? staffMember.name : 'Unknown'}</td>
                          <td><span className="badge primary">{l.type || l.leave_type}</span></td>
                          <td>{l.reason}</td>
                          <td>
                            <span className={`badge ${l.status === 'Approved' ? 'success' : l.status === 'Rejected' ? 'danger' : 'warning'}`}>
                              {l.status}
                            </span>
                          </td>
                          <td>
                            {l.status === 'Pending' && (
                              <div className="flex-align-gap">
                                <button className="btn-outline text-success" style={{ padding: '0.2rem 0.5rem' }} onClick={() => updateLeaveStatus(l.id, 'Approved')}><Check size={16} /></button>
                                <button className="btn-outline text-danger" style={{ padding: '0.2rem 0.5rem' }} onClick={() => updateLeaveStatus(l.id, 'Rejected')}><X size={16} /></button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PAYROLL */}
        {activeTab === 'Payroll' && (
          <div>
            <div className="flex-align-gap mb-4" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div>
                <h3>Monthly Payroll Calculation</h3>
                <p className="text-muted text-sm">Calculated automatically based on (Base Salary / 30 * Present Days) + Bonus.</p>
              </div>
              <div className="flex-align-gap">
                <span className="text-sm font-bold text-muted">Payroll Month:</span>
                <input
                  type="month"
                  className="p-2 bg-input border border-gray-700 rounded text-main font-bold"
                  value={payrollMonth}
                  onChange={(e) => setPayrollMonth(e.target.value)}
                />
              </div>
            </div>

            {safeStaff.length === 0 ? <p className="text-muted py-6 text-center">No staff to generate payroll.</p> : (
              <div className="table-responsive">
                <table className="data-table mt-4">
                  <thead>
                    <tr>
                      <th>Staff Name</th>
                      <th>Days Present</th>
                      <th>Base Salary</th>
                      <th>Bonus ()</th>
                      <th>Net Pay</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeStaff.map(s => {
                      const presentDays = safeAttendance.filter(a => String(a.staffId || a.staff_id || a.staff) === String(s.id) && a.status === 'Present' && String(a.date || '').startsWith(payrollMonth)).length;
                      const dailyRate = Number(s.baseSalary || 0) / 30;
                      const bonus = bonuses[s.id] || 0;
                      const netPay = Math.round((dailyRate * presentDays) + bonus);

                      const isPaid = safePayrolls.some(p => String(p.staffId || p.staff_id || p.staff) === String(s.id) && p.month === payrollMonth);

                      return (
                        <tr key={s.id}>
                          <td className="font-bold">{s.name}</td>
                          <td>
                            <span className="badge success">{presentDays} / 30 Days</span>
                          </td>
                          <td>{Number(s.baseSalary || 0).toLocaleString()}</td>
                          <td>
                            {isPaid ? (
                              <span>{Number(safePayrolls.find(p => String(p.staffId || p.staff_id || p.staff) === String(s.id) && p.month === payrollMonth)?.bonus || 0).toLocaleString()}</span>
                            ) : (
                              <div className="flex-align-gap">
                                <Award size={14} className="text-warning" />
                                <input
                                  type="number"
                                  value={bonus}
                                  onChange={(e) => setBonuses({ ...bonuses, [s.id]: parseFloat(e.target.value) || 0 })}
                                  style={{ width: '90px', padding: '0.3rem', backgroundColor: 'var(--bg-input)' }}
                                />
                              </div>
                            )}
                          </td>
                          <td className="text-primary font-bold text-lg">
                            {Number(isPaid ? safePayrolls.find(p => String(p.staffId || p.staff_id || p.staff) === String(s.id) && p.month === payrollMonth)?.netPay : netPay).toLocaleString()}
                          </td>
                          <td>
                            {isPaid ? <span className="badge success">Paid</span> : <span className="badge warning">Pending</span>}
                          </td>
                          <td>
                            {!isPaid && (
                              <button className="btn-primary" onClick={() => handleGeneratePayslip(s, presentDays, bonus)}>
                                Pay Salary
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* DETAILED ATTENDANCE DATE BREAKDOWN MODAL PORTAL */}
      {selectedStaffAttendanceLog && createPortal(
        <div className="drawer-overlay" style={{ zIndex: 10000 }} onClick={() => setSelectedStaffAttendanceLog(null)}>
          <div 
            style={{ 
              maxWidth: '560px', 
              width: '90%', 
              margin: 'auto', 
              background: 'var(--bg-card)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '16px', 
              boxShadow: 'var(--shadow-xl)', 
              padding: '1.75rem',
              position: 'relative'
            }} 
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>📅 Date-by-Date Attendance Log</h2>
                <p className="text-muted text-sm">{selectedStaffAttendanceLog.staff?.name} ({selectedStaffAttendanceLog.staff?.role})</p>
              </div>
              <button className="btn-icon" onClick={() => setSelectedStaffAttendanceLog(null)}>
                <X size={20} />
              </button>
            </div>

            {/* Quick Summary Pill Badges */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              <span className="badge success">Present: {selectedStaffAttendanceLog.presentCount} days</span>
              <span className="badge danger">Absent: {selectedStaffAttendanceLog.absentCount} days</span>
              <span className="badge warning">Late: {selectedStaffAttendanceLog.lateCount} days</span>
              <span className="badge info">Leave: {selectedStaffAttendanceLog.leaveCount} days</span>
            </div>

            {/* Chronological Date List */}
            <label className="text-muted text-sm font-bold block mb-2">Recorded Dates:</label>
            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.5rem', background: 'var(--bg-hover)' }}>
              {(selectedStaffAttendanceLog.records || []).length === 0 ? (
                <div className="text-center text-muted py-6">No attendance records found for this employee in the selected period.</div>
              ) : (
                <table className="data-table" style={{ fontSize: '0.9rem' }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Recorded At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedStaffAttendanceLog.records.map((rec, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{rec.date}</td>
                        <td>
                          <span className={`badge ${rec.status === 'Present' ? 'success' : rec.status === 'Absent' ? 'danger' : rec.status === 'Late' ? 'warning' : 'info'}`}>
                            {rec.status === 'Present' && '🟢 Present'}
                            {rec.status === 'Absent' && '🔴 Absent'}
                            {rec.status === 'Late' && '🟡 Late'}
                            {rec.status === 'Leave' && '🔵 On Leave'}
                          </span>
                        </td>
                        <td className="text-muted text-xs">
                          {rec.marked_at ? new Date(rec.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Logged'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-primary" onClick={() => setSelectedStaffAttendanceLog(null)}>Close</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ADD STAFF DRAWER */}
      {showAddStaffModal && createPortal(
        <div className="drawer-overlay" onClick={() => setShowAddStaffModal(false)}>
          <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>Add New Staff Member</h2>
              <button className="drawer-close-btn" onClick={() => setShowAddStaffModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="drawer-body">
              <form id="add-staff-form" onSubmit={handleAddStaff}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
                  <div>
                    <label className="text-muted text-sm block mb-1">Full Name *</label>
                    <input type="text" className="w-full" required value={newStaff.name} onChange={e => setNewStaff({ ...newStaff, name: e.target.value })} placeholder="e.g. Abul Hasan" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label className="text-muted text-sm block mb-1">Role</label>
                      <select className="w-full" value={newStaff.role} onChange={e => setNewStaff({ ...newStaff, role: e.target.value })}>
                        <option value="Manager">Manager</option>
                        <option value="Salesman">Salesman (SR)</option>
                        <option value="Cashier">Cashier</option>
                        <option value="Delivery">Delivery Driver</option>
                        <option value="Support">Support Staff</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-muted text-sm block mb-1">Base Salary (৳)</label>
                      <input type="number" className="w-full" value={newStaff.baseSalary} onChange={e => setNewStaff({ ...newStaff, baseSalary: e.target.value })} placeholder="e.g. 15000" />
                    </div>
                  </div>
                  <div>
                    <label className="text-muted text-sm block mb-1">Phone Number</label>
                    <input type="text" className="w-full" value={newStaff.phone} onChange={e => setNewStaff({ ...newStaff, phone: e.target.value })} placeholder="e.g. 01700000000" />
                  </div>
                  <div>
                    <label className="text-muted text-sm block mb-1">Address</label>
                    <input type="text" className="w-full" value={newStaff.address} onChange={e => setNewStaff({ ...newStaff, address: e.target.value })} placeholder="Full Address" />
                  </div>
                  <div>
                    <label className="text-muted text-sm block mb-1">Bank / bKash Account Info</label>
                    <input type="text" className="w-full" value={newStaff.bankAccount} onChange={e => setNewStaff({ ...newStaff, bankAccount: e.target.value })} placeholder="Account Number for Payroll" />
                  </div>
                  
                  {/* For System Login if applicable */}
                  <div className="card glass mt-4" style={{ padding: '1rem', border: '1px dashed var(--border-color)' }}>
                    <h4 className="font-bold mb-2 text-sm text-primary">System Access (Optional)</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label className="text-muted text-sm block mb-1">Username</label>
                        <input type="text" className="w-full" value={newStaff.username} onChange={e => setNewStaff({ ...newStaff, username: e.target.value })} placeholder="For login" />
                      </div>
                      <div>
                        <label className="text-muted text-sm block mb-1">Password</label>
                        <input type="password" className="w-full" value={newStaff.password} onChange={e => setNewStaff({ ...newStaff, password: e.target.value })} placeholder="Keep it secure" />
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div className="drawer-footer">
              <button type="button" className="btn-outline" onClick={() => setShowAddStaffModal(false)}>Cancel</button>
              <button type="submit" form="add-staff-form" className="btn-primary flex-align-gap"><Check size={18} /> Complete Registration</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Staff Drawer */}
      {showEditStaffModal && createPortal(
        <div className="drawer-overlay" onClick={() => setShowEditStaffModal(false)}>
          <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>Edit Staff Member</h2>
              <button className="drawer-close-btn" onClick={() => setShowEditStaffModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="drawer-body">
              <form id="edit-staff-form" onSubmit={handleUpdateStaff}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
                  <div>
                    <label className="text-muted text-sm block mb-1">Staff ID (Cannot change)</label>
                    <input type="text" className="w-full" value={editingStaff.id} disabled style={{ background: 'var(--bg-hover)' }} />
                  </div>
                  <div>
                    <label className="text-muted text-sm block mb-1">Full Name *</label>
                    <input type="text" className="w-full" required value={editingStaff.name} onChange={e => setEditingStaff({ ...editingStaff, name: e.target.value })} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label className="text-muted text-sm block mb-1">Role</label>
                      <select className="w-full" value={editingStaff.role} onChange={e => setEditingStaff({ ...editingStaff, role: e.target.value })}>
                        <option value="Manager">Manager</option>
                        <option value="Salesman">Salesman (SR)</option>
                        <option value="Cashier">Cashier</option>
                        <option value="Delivery">Delivery Driver</option>
                        <option value="Support">Support Staff</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-muted text-sm block mb-1">Base Salary (৳)</label>
                      <input type="number" className="w-full" value={editingStaff.baseSalary} onChange={e => setEditingStaff({ ...editingStaff, baseSalary: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="text-muted text-sm block mb-1">Phone Number</label>
                    <input type="text" className="w-full" value={editingStaff.phone} onChange={e => setEditingStaff({ ...editingStaff, phone: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-muted text-sm block mb-1">Address</label>
                    <input type="text" className="w-full" value={editingStaff.address} onChange={e => setEditingStaff({ ...editingStaff, address: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-muted text-sm block mb-1">Bank / bKash Account Info</label>
                    <input type="text" className="w-full" value={editingStaff.bankAccount} onChange={e => setEditingStaff({ ...editingStaff, bankAccount: e.target.value })} />
                  </div>
                  
                  {/* For System Login if applicable */}
                  <div className="card glass mt-4" style={{ padding: '1rem', border: '1px dashed var(--border-color)' }}>
                    <h4 className="font-bold mb-2 text-sm text-primary">System Access (Optional)</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label className="text-muted text-sm block mb-1">Username</label>
                        <input type="text" className="w-full" value={editingStaff.username || ''} onChange={e => setEditingStaff({ ...editingStaff, username: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-muted text-sm block mb-1">Password</label>
                        <input type="password" className="w-full" value={editingStaff.password || ''} onChange={e => setEditingStaff({ ...editingStaff, password: e.target.value })} placeholder="Leave blank to keep unchanged" />
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div className="drawer-footer">
              <button type="button" className="btn-outline" onClick={() => setShowEditStaffModal(false)}>Cancel</button>
              <button type="submit" form="edit-staff-form" className="btn-primary flex-align-gap"><Edit size={18} /> Update Staff</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* APPLY LEAVE MODAL */}
      {showLeaveModal && createPortal(
        <div className="drawer-overlay" onClick={() => setShowLeaveModal(false)}>
          <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>Apply Leave Request</h2>
              <button className="drawer-close-btn" onClick={() => setShowLeaveModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="drawer-body">
              <form id="apply-leave-form" onSubmit={handleApplyLeave}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
                  <div>
                    <label className="text-muted text-sm block mb-1">Staff Member *</label>
                    <select className="w-full" required value={newLeave.staffId} onChange={e => setNewLeave({ ...newLeave, staffId: e.target.value })}>
                      <option value="" disabled>Select Staff Member</option>
                      {safeStaff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label className="text-muted text-sm block mb-1">Start Date (From) *</label>
                      <input 
                        type="date" 
                        className="w-full" 
                        required 
                        value={newLeave.startDate} 
                        onChange={e => setNewLeave({ ...newLeave, startDate: e.target.value, endDate: e.target.value > newLeave.endDate ? e.target.value : newLeave.endDate })} 
                      />
                    </div>
                    <div>
                      <label className="text-muted text-sm block mb-1">End Date (To) *</label>
                      <input 
                        type="date" 
                        className="w-full" 
                        required 
                        value={newLeave.endDate} 
                        onChange={e => setNewLeave({ ...newLeave, endDate: e.target.value })} 
                      />
                    </div>
                  </div>

                  {/* Calculated Duration Display */}
                  <div className="card glass" style={{ padding: '0.75rem', background: 'var(--bg-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="text-sm text-muted">Total Leave Duration:</span>
                    <span className="badge warning font-bold" style={{ fontSize: '0.9rem' }}>
                      {(() => {
                        if (!newLeave.startDate || !newLeave.endDate) return '1 Day';
                        const diff = (new Date(newLeave.endDate) - new Date(newLeave.startDate)) / (1000 * 60 * 60 * 24);
                        const count = Math.max(1, Math.round(diff) + 1);
                        return `${count} Day(s)`;
                      })()}
                    </span>
                  </div>

                  <div>
                    <label className="text-muted text-sm block mb-1">Leave Type</label>
                    <select className="w-full" value={newLeave.type} onChange={e => setNewLeave({ ...newLeave, type: e.target.value })}>
                      <option value="Casual">Casual Leave (নৈমিত্তিক ছুটি)</option>
                      <option value="Sick">Sick Leave (অসুস্থতাজনিত ছুটি)</option>
                      <option value="Annual">Annual Leave (বার্ষিক ছুটি)</option>
                      <option value="Unpaid">Unpaid Leave (বিনা বেতনে ছুটি)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-muted text-sm block mb-1">Reason for Leave *</label>
                    <textarea rows="3" className="w-full" required value={newLeave.reason} onChange={e => setNewLeave({ ...newLeave, reason: e.target.value })} placeholder="State the reason for leave request..." />
                  </div>
                </div>
              </form>
            </div>
            <div className="drawer-footer">
              <button type="button" className="btn-outline" onClick={() => setShowLeaveModal(false)}>Cancel</button>
              <button type="submit" form="apply-leave-form" className="btn-primary">Submit Leave Request</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* STAFF PROFILE DRAWER */}
      {selectedStaff && createPortal(
        <div className="drawer-overlay" onClick={() => setSelectedStaff(null)}>
          <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
            
            <div className="drawer-header" style={{ borderBottom: 'none' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Staff Profile Document</h3>
              <button className="drawer-close-btn" onClick={() => setSelectedStaff(null)}>
                <X size={24} />
              </button>
            </div>
            <div className="drawer-body">
              <div className="card glass text-center mb-4" style={{ padding: '1.5rem' }}>
                <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', fontSize: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto', fontWeight: 'bold' }}>
                  {selectedStaff.name?.charAt(0)}
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 'bold' }}>{selectedStaff.name}</h2>
                <p className="badge primary mt-1">{selectedStaff.role}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                <div className="flex-align-gap" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span className="text-muted">Staff ID:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{selectedStaff.id}</span>
                </div>
                <div className="flex-align-gap" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span className="text-muted">Base Salary:</span>
                  <span className="font-bold text-primary">{Number(selectedStaff.baseSalary || 0).toLocaleString()}</span>
                </div>
                <div className="flex-align-gap" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span className="text-muted">Phone:</span>
                  <span>{selectedStaff.phone || '-'}</span>
                </div>
                <div className="flex-align-gap" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span className="text-muted">Bank/bKash:</span>
                  <span>{selectedStaff.bankAccount || '-'}</span>
                </div>
                <div className="flex-align-gap" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span className="text-muted">Join Date:</span>
                  <span>{selectedStaff.joinDate || selectedStaff.created_at?.split('T')[0] || '-'}</span>
                </div>
                <div className="flex-align-gap" style={{ justifyContent: 'space-between' }}>
                  <span className="text-muted">Address:</span>
                  <span>{selectedStaff.address || '-'}</span>
                </div>
              </div>
            </div>
            <div className="drawer-footer">
              <button type="button" className="btn-primary w-full" onClick={() => setSelectedStaff(null)}>Done</button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default HR;
