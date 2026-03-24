// ==================== CONSTANTS ====================
const MAX_CREDITS = 18;
const TUITION_FEE = 5000;

const GRADE_POINTS = {
    'A+': 4.0, 'A': 3.7, 'B+': 3.3, 'B': 3.0,
    'C+': 2.7, 'C': 2.3, 'D': 2.0, 'F': 0.0
};

// ==================== GLOBAL VARIABLES ====================
let students = [];
let courses = [];
let currentUser = null;
let chartInstances = {};

// ==================== UTILITY FUNCTIONS ====================
function showLoading(show = true) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        if (show) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.background = type === 'error' ? '#ff3d00' : '#00c853';
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

function saveData() {
    try {
        localStorage.setItem('students', JSON.stringify(students));
        localStorage.setItem('courses', JSON.stringify(courses));
    } catch (error) {
        showToast('Error saving data!', 'error');
    }
}

function loadData() {
    try {
        const storedStudents = localStorage.getItem('students');
        const storedCourses = localStorage.getItem('courses');
        
        students = storedStudents ? JSON.parse(storedStudents) : [];
        courses = storedCourses ? JSON.parse(storedCourses) : [];
        
        // Initialize missing properties for backward compatibility
        students.forEach(student => {
            if (!student.courses) student.courses = [];
            if (!student.grades) student.grades = [];
            if (student.feePaid === undefined) student.feePaid = false;
            if (!student.fineAmount) student.fineAmount = 0;
            student.cgpa = calculateCGPA(student);
        });
        
        saveData();
    } catch (error) {
        console.error('Error loading data:', error);
        students = [];
        courses = [];
    }
}

// ==================== CGPA CALCULATION ====================
function calculateCGPA(student) {
    if (!student.grades || student.grades.length === 0) return 0;
    
    let totalPoints = 0;
    let totalCredits = 0;
    
    student.grades.forEach(grade => {
        const course = courses.find(c => c.code === grade.courseCode);
        if (course && grade.gradePoint) {
            totalPoints += grade.gradePoint * course.credits;
            totalCredits += course.credits;
        }
    });
    
    return totalCredits > 0 ? parseFloat((totalPoints / totalCredits).toFixed(2)) : 0;
}

function updateStudentCGPA(roll) {
    const student = students.find(s => s.roll === roll);
    if (student) {
        student.cgpa = calculateCGPA(student);
        saveData();
    }
}

function getGradeLetter(gradePoint) {
    for (let [letter, points] of Object.entries(GRADE_POINTS)) {
        if (points === gradePoint) return letter;
    }
    return gradePoint.toString();
}

function getGradePoint(letter) {
    return GRADE_POINTS[letter] || 0;
}

// ==================== AUTHENTICATION ====================
function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username) {
        showToast('Please enter username or roll number!', 'error');
        return;
    }
    
    if (username === 'admin' && password === 'admin123') {
        currentUser = 'admin';
        document.getElementById('loginPage').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        document.getElementById('panelTitle').textContent = 'Admin Panel';
        document.getElementById('adminMenu').classList.remove('hidden');
        document.getElementById('studentMenu').classList.add('hidden');
        document.getElementById('adminPanel').classList.remove('hidden');
        document.getElementById('studentPanel').classList.add('hidden');
        
        updateDashboardStats();
        renderStudents();
        renderCourses();
        updateCourseStats();
        initAllCharts();
        showToast('Welcome Admin!');
    } else {
        const student = students.find(s => s.roll === username);
        if (student) {
            currentUser = student.roll;
            document.getElementById('loginPage').classList.add('hidden');
            document.getElementById('app').classList.remove('hidden');
            document.getElementById('panelTitle').textContent = 'Student Panel';
            document.getElementById('adminMenu').classList.add('hidden');
            document.getElementById('studentMenu').classList.remove('hidden');
            document.getElementById('adminPanel').classList.add('hidden');
            document.getElementById('studentPanel').classList.remove('hidden');
            
            showStudentDashboard();
            showToast(`Welcome ${student.name}!`);
        } else {
            showToast('Invalid credentials!', 'error');
        }
    }
}

function logout() {
    currentUser = null;
    location.reload();
}

// ==================== DASHBOARD FUNCTIONS ====================
function updateDashboardStats() {
    const totalStudents = students.length;
    const totalCoursesCount = courses.length;
    const totalRevenue = students.reduce((sum, s) => sum + (s.feePaid ? TUITION_FEE : 0), 0);
    const avgCgpa = students.length > 0 
        ? (students.reduce((sum, s) => sum + s.cgpa, 0) / students.length).toFixed(2)
        : 0;
    
    document.getElementById('totalStudents').textContent = totalStudents;
    document.getElementById('totalCourses').textContent = totalCoursesCount;
    document.getElementById('totalRevenue').textContent = `₹${totalRevenue.toLocaleString()}`;
    document.getElementById('avgCgpa').textContent = avgCgpa;
}

function initAllCharts() {
    // Performance Chart
    const perfCtx = document.getElementById('performanceChart')?.getContext('2d');
    if (perfCtx && chartInstances.performance) chartInstances.performance.destroy();
    if (perfCtx) {
        const topStudents = [...students].sort((a, b) => b.cgpa - a.cgpa).slice(0, 10);
        chartInstances.performance = new Chart(perfCtx, {
            type: 'bar',
            data: {
                labels: topStudents.map(s => s.roll),
                datasets: [{
                    label: 'CGPA',
                    data: topStudents.map(s => s.cgpa),
                    backgroundColor: 'rgba(0, 198, 255, 0.6)',
                    borderColor: '#00c6ff',
                    borderWidth: 1,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: { beginAtZero: true, max: 4, grid: { color: 'rgba(255,255,255,0.1)' } },
                    x: { grid: { display: false } }
                },
                plugins: {
                    legend: { labels: { color: '#ffffff' } }
                }
            }
        });
    }
    
    // Department Chart
    const deptCtx = document.getElementById('deptChart')?.getContext('2d');
    if (deptCtx && chartInstances.department) chartInstances.department.destroy();
    if (deptCtx) {
        const deptData = {};
        students.forEach(s => {
            deptData[s.department] = (deptData[s.department] || 0) + 1;
        });
        chartInstances.department = new Chart(deptCtx, {
            type: 'pie',
            data: {
                labels: Object.keys(deptData),
                datasets: [{
                    data: Object.values(deptData),
                    backgroundColor: ['#00c6ff', '#0072ff', '#00e5ff', '#00b0ff', '#0091ea']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: '#ffffff' } }
                }
            }
        });
    }
    
    // Fee Chart
    const feeCtx = document.getElementById('feeChart')?.getContext('2d');
    if (feeCtx && chartInstances.fee) chartInstances.fee.destroy();
    if (feeCtx) {
        const paidCount = students.filter(s => s.feePaid).length;
        const unpaidCount = students.length - paidCount;
        chartInstances.fee = new Chart(feeCtx, {
            type: 'pie',
            data: {
                labels: ['Paid', 'Unpaid'],
                datasets: [{
                    data: [paidCount || 1, unpaidCount || 1],
                    backgroundColor: ['#00c853', '#ff3d00']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: '#ffffff' } }
                }
            }
        });
    }
    
    // Grade Distribution Chart
    const gradeDistCtx = document.getElementById('gradeDistributionChart')?.getContext('2d');
    if (gradeDistCtx && chartInstances.gradeDistribution) chartInstances.gradeDistribution.destroy();
    if (gradeDistCtx) {
        const grades = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'];
        const distribution = new Array(8).fill(0);
        
        students.forEach(student => {
            if (student.grades) {
                student.grades.forEach(grade => {
                    const letter = getGradeLetter(grade.gradePoint);
                    const index = grades.indexOf(letter);
                    if (index !== -1) distribution[index]++;
                });
            }
        });
        
        chartInstances.gradeDistribution = new Chart(gradeDistCtx, {
            type: 'bar',
            data: {
                labels: grades,
                datasets: [{
                    label: 'Number of Students',
                    data: distribution,
                    backgroundColor: 'rgba(108, 92, 231, 0.6)',
                    borderColor: '#6c5ce7',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' } },
                    x: { grid: { display: false } }
                },
                plugins: {
                    legend: { labels: { color: '#ffffff' } }
                }
            }
        });
    }
    
    // Fee Chart Summary
    const feeSummaryCtx = document.getElementById('feeChartSummary')?.getContext('2d');
    if (feeSummaryCtx && chartInstances.feeSummary) chartInstances.feeSummary.destroy();
    if (feeSummaryCtx) {
        const paidCount = students.filter(s => s.feePaid).length;
        const unpaidCount = students.length - paidCount;
        chartInstances.feeSummary = new Chart(feeSummaryCtx, {
            type: 'doughnut',
            data: {
                labels: ['Paid', 'Unpaid'],
                datasets: [{
                    data: [paidCount || 1, unpaidCount || 1],
                    backgroundColor: ['#00c853', '#ff3d00']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: '#ffffff' } }
                }
            }
        });
    }
}

// ==================== STUDENT MANAGEMENT ====================
function addStudent() {
    const roll = document.getElementById('roll').value.trim();
    const name = document.getElementById('name').value.trim();
    const department = document.getElementById('dept').value.trim();
    const semester = parseInt(document.getElementById('semester').value);
    
    if (!roll || !name || !department || !semester) {
        showToast('Please fill all fields!', 'error');
        return;
    }
    
    if (students.find(s => s.roll === roll)) {
        showToast('Student already exists!', 'error');
        return;
    }
    
    students.push({
        roll, name, department, semester,
        courses: [],
        grades: [],
        cgpa: 0,
        feePaid: false,
        fineAmount: 0
    });
    
    saveData();
    renderStudents();
    updateDashboardStats();
    initAllCharts();
    showToast('Student added successfully!');
    
    // Clear form
    document.getElementById('roll').value = '';
    document.getElementById('name').value = '';
    document.getElementById('dept').value = '';
    document.getElementById('semester').value = '';
}

function renderStudents() {
    const tbody = document.querySelector('#studentTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    const searchTerm = document.getElementById('searchRoll')?.value.toLowerCase() || '';
    
    const filteredStudents = students.filter(s => 
        s.roll.toLowerCase().includes(searchTerm) ||
        s.name.toLowerCase().includes(searchTerm) ||
        s.department.toLowerCase().includes(searchTerm)
    );
    
    filteredStudents.forEach(student => {
        const cgpaColor = student.cgpa >= 3.0 ? '#00c853' : student.cgpa >= 2.0 ? '#ffa000' : '#ff3d00';
        const feeStatusColor = student.feePaid ? '#00c853' : '#ff3d00';
        
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${student.roll}</td>
            <td>${escapeHtml(student.name)}</td>
            <td>${escapeHtml(student.department)}</td>
            <td>${student.semester}</td>
            <td style="color: ${cgpaColor}; font-weight: bold;">${student.cgpa.toFixed(2)}</td>
            <td style="color: ${feeStatusColor};">${student.feePaid ? 'Paid ✓' : 'Unpaid ✗'}</td>
            <td>₹${student.fineAmount || 0}</td>
            <td class="action-buttons">
                <button onclick="editStudent('${student.roll}')" class="btn-small btn-edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteStudent('${student.roll}')" class="btn-small btn-delete">
                    <i class="fas fa-trash"></i>
                </button>
                <button onclick="viewStudentDetails('${student.roll}')" class="btn-small btn-view">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function searchStudent() {
    renderStudents();
}

function deleteStudent(roll) {
    if (confirm('Are you sure you want to delete this student? This action cannot be undone!')) {
        students = students.filter(s => s.roll !== roll);
        saveData();
        renderStudents();
        updateDashboardStats();
        initAllCharts();
        updateQuickAllocate();
        showToast('Student deleted successfully!');
    }
}

function editStudent(roll) {
    const student = students.find(s => s.roll === roll);
    if (student) {
        document.getElementById('roll').value = student.roll;
        document.getElementById('name').value = student.name;
        document.getElementById('dept').value = student.department;
        document.getElementById('semester').value = student.semester;
        showSection('students');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast('Edit student details and click Add to update');
    }
}

function viewStudentDetails(roll) {
    const student = students.find(s => s.roll === roll);
    if (!student) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h2><i class="fas fa-user-graduate"></i> Student Details</h2>
            <div class="student-detail">
                <p><strong>Name:</strong> ${escapeHtml(student.name)}</p>
                <p><strong>Roll Number:</strong> ${student.roll}</p>
                <p><strong>Department:</strong> ${escapeHtml(student.department)}</p>
                <p><strong>Semester:</strong> ${student.semester}</p>
                <p><strong>CGPA:</strong> ${student.cgpa.toFixed(2)}</p>
                <p><strong>Fee Status:</strong> ${student.feePaid ? 'Paid ✓' : 'Unpaid ✗'}</p>
                <p><strong>Fine Amount:</strong> ₹${student.fineAmount || 0}</p>
            </div>
            <h3><i class="fas fa-book"></i> Enrolled Courses</h3>
            ${renderStudentCourses(student)}
        </div>
    `;
    document.body.appendChild(modal);
}

function renderStudentCourses(student) {
    if (!student.courses || student.courses.length === 0) {
        return '<p>No courses enrolled.</p>';
    }
    
    let html = '<table><thead><tr><th>Code</th><th>Course</th><th>Credits</th><th>Grade</th></tr></thead><tbody>';
    student.courses.forEach(code => {
        const course = courses.find(c => c.code === code);
        const grade = student.grades?.find(g => g.courseCode === code);
        if (course) {
            html += `<tr>
                <td>${course.code}</td>
                <td>${escapeHtml(course.name)}</td>
                <td>${course.credits}</td>
                <td>${grade ? getGradeLetter(grade.gradePoint) : 'Not Graded'}</td>
            </tr>`;
        }
    });
    html += '</tbody></table>';
    return html;
}

function exportStudents() {
    const headers = ['Roll Number', 'Name', 'Department', 'Semester', 'CGPA', 'Fee Status', 'Fine Amount'];
    const rows = students.map(s => [
        s.roll, s.name, s.department, s.semester, s.cgpa.toFixed(2),
        s.feePaid ? 'Paid' : 'Unpaid', s.fineAmount || 0
    ]);
    
    downloadCSV(headers, rows, 'students_export.csv');
}

// ==================== COURSE MANAGEMENT ====================
function addCourse() {
    const code = document.getElementById('courseCode').value.trim().toUpperCase();
    const name = document.getElementById('courseName').value.trim();
    const credits = parseInt(document.getElementById('credits').value);
    const teacher = document.getElementById('teacher').value.trim();
    
    if (!code || !name || !credits || !teacher) {
        showToast('Please fill all fields!', 'error');
        return;
    }
    
    if (courses.find(c => c.code === code)) {
        showToast('Course already exists!', 'error');
        return;
    }
    
    courses.push({ code, name, credits, teacher });
    saveData();
    renderCourses();
    updateCourseStats();
    updateDashboardStats();
    initAllCharts();
    updateQuickAllocate();
    showToast('Course added successfully!');
    
    // Clear form
    document.getElementById('courseCode').value = '';
    document.getElementById('courseName').value = '';
    document.getElementById('credits').value = '';
    document.getElementById('teacher').value = '';
}

function renderCourses() {
    const tbody = document.querySelector('#courseTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    const searchTerm = document.getElementById('searchCourse')?.value.toLowerCase() || '';
    
    const filteredCourses = courses.filter(c => 
        c.code.toLowerCase().includes(searchTerm) ||
        c.name.toLowerCase().includes(searchTerm) ||
        c.teacher.toLowerCase().includes(searchTerm)
    );
    
    filteredCourses.forEach(course => {
        const enrolledCount = students.filter(s => s.courses?.includes(course.code)).length;
        const row = tbody.insertRow();
        row.innerHTML = `
            <td><input type="checkbox" class="course-checkbox" value="${course.code}"></td>
            <td>${course.code}</td>
            <td>${escapeHtml(course.name)}</td>
            <td>${course.credits}</td>
            <td>${escapeHtml(course.teacher)}</td>
            <td>${enrolledCount}</td>
            <td class="action-buttons">
                <button onclick="editCourse('${course.code}')" class="btn-small btn-edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteCourse('${course.code}')" class="btn-small btn-delete">
                    <i class="fas fa-trash"></i>
                </button>
                <button onclick="viewEnrolledStudents('${course.code}')" class="btn-small btn-view">
                    <i class="fas fa-users"></i>
                </button>
            </td>
        `;
    });
}

function deleteCourse(code) {
    if (confirm('Are you sure you want to delete this course? This will remove it from all students!')) {
        students.forEach(student => {
            student.courses = student.courses.filter(c => c !== code);
            student.grades = student.grades.filter(g => g.courseCode !== code);
            student.cgpa = calculateCGPA(student);
        });
        
        courses = courses.filter(c => c.code !== code);
        saveData();
        renderCourses();
        updateCourseStats();
        renderStudents();
        updateDashboardStats();
        initAllCharts();
        updateQuickAllocate();
        showToast('Course deleted successfully!');
    }
}

function editCourse(code) {
    const course = courses.find(c => c.code === code);
    if (course) {
        document.getElementById('courseCode').value = course.code;
        document.getElementById('courseName').value = course.name;
        document.getElementById('credits').value = course.credits;
        document.getElementById('teacher').value = course.teacher;
        showSection('courses');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast('Edit course details and click Add to update');
    }
}

function deleteMultipleCourses() {
    const selected = Array.from(document.querySelectorAll('.course-checkbox:checked')).map(cb => cb.value);
    if (selected.length === 0) {
        showToast('No courses selected!', 'error');
        return;
    }
    
    if (confirm(`Delete ${selected.length} course(s)? This will remove them from all students!`)) {
        selected.forEach(code => {
            students.forEach(student => {
                student.courses = student.courses.filter(c => c !== code);
                student.grades = student.grades.filter(g => g.courseCode !== code);
                student.cgpa = calculateCGPA(student);
            });
            courses = courses.filter(c => c.code !== code);
        });
        
        saveData();
        renderCourses();
        updateCourseStats();
        renderStudents();
        updateDashboardStats();
        initAllCharts();
        updateQuickAllocate();
        showToast(`${selected.length} course(s) deleted successfully!`);
    }
}

function searchCourse() {
    renderCourses();
    updateCourseStats();
}

function updateCourseStats() {
    const totalCourses = courses.length;
    const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);
    const avgCredits = totalCourses > 0 ? (totalCredits / totalCourses).toFixed(1) : 0;
    
    document.getElementById('totalCoursesCount').textContent = totalCourses;
    document.getElementById('totalCreditsCount').textContent = totalCredits;
    document.getElementById('avgCredits').textContent = avgCredits;
}

function toggleSelectAll(checkbox) {
    document.querySelectorAll('.course-checkbox').forEach(cb => cb.checked = checkbox.checked);
}

function viewEnrolledStudents(courseCode) {
    const course = courses.find(c => c.code === courseCode);
    const enrolledStudents = students.filter(s => s.courses?.includes(courseCode));
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h2><i class="fas fa-users"></i> Students in ${course.name} (${course.code})</h2>
            <p><strong>Total:</strong> ${enrolledStudents.length} students</p>
            ${enrolledStudents.length > 0 ? `
                <table>
                    <thead>
                        <tr><th>Roll</th><th>Name</th><th>Department</th><th>Grade</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                        ${enrolledStudents.map(s => {
                            const grade = s.grades?.find(g => g.courseCode === courseCode);
                            return `<tr>
                                <td>${s.roll}</td>
                                <td>${escapeHtml(s.name)}</td>
                                <td>${escapeHtml(s.department)}</td>
                                <td>${grade ? getGradeLetter(grade.gradePoint) : 'Not Graded'}</td>
                                <td><button onclick="removeCourseFromStudent('${s.roll}', '${courseCode}')" class="btn-small btn-delete">Remove</button></td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            ` : '<p>No students enrolled.</p>'}
        </div>
    `;
    document.body.appendChild(modal);
}

function removeCourseFromStudent(roll, courseCode) {
    if (confirm('Remove this course from student?')) {
        const student = students.find(s => s.roll === roll);
        if (student) {
            student.courses = student.courses.filter(c => c !== courseCode);
            student.grades = student.grades.filter(g => g.courseCode !== courseCode);
            student.cgpa = calculateCGPA(student);
            saveData();
            renderStudents();
            viewEnrolledStudents(courseCode);
            showToast('Course removed from student!');
        }
    }
}

function exportCourses() {
    const headers = ['Course Code', 'Course Name', 'Credits', 'Teacher', 'Students Enrolled'];
    const rows = courses.map(c => [
        c.code, c.name, c.credits, c.teacher,
        students.filter(s => s.courses?.includes(c.code)).length
    ]);
    downloadCSV(headers, rows, 'courses_export.csv');
}

// ==================== COURSE ALLOCATION ====================
function allocateCourse() {
    const roll = document.getElementById('allocRoll').value.trim();
    const code = document.getElementById('allocCode').value.trim().toUpperCase();
    
    if (!roll || !code) {
        showToast('Please enter both roll number and course code!', 'error');
        return;
    }
    
    const student = students.find(s => s.roll === roll);
    const course = courses.find(c => c.code === code);
    
    if (!student) {
        showToast('Student not found!', 'error');
        return;
    }
    
    if (!course) {
        showToast('Course not found!', 'error');
        return;
    }
    
    if (!student.courses) student.courses = [];
    
    if (student.courses.includes(code)) {
        showToast('Course already allocated!', 'error');
        return;
    }
    
    const currentCredits = student.courses
        .map(c => courses.find(x => x.code === c)?.credits || 0)
        .reduce((a, b) => a + b, 0);
    
    if (currentCredits + course.credits > MAX_CREDITS) {
        showToast(`Credit limit exceeded! Max ${MAX_CREDITS} credits. Current: ${currentCredits}`, 'error');
        return;
    }
    
    student.courses.push(code);
    saveData();
    
    document.getElementById('allocRoll').value = '';
    document.getElementById('allocCode').value = '';
    updateQuickAllocate();
    showToast(`Course allocated to ${student.name} successfully!`);
}

function quickAllocate() {
    const roll = document.getElementById('quickStudent').value;
    const code = document.getElementById('quickCourse').value;
    
    if (!roll || !code) {
        showToast('Please select both student and course!', 'error');
        return;
    }
    
    document.getElementById('allocRoll').value = roll;
    document.getElementById('allocCode').value = code;
    allocateCourse();
}

function updateQuickAllocate() {
    const studentSelect = document.getElementById('quickStudent');
    const courseSelect = document.getElementById('quickCourse');
    
    if (studentSelect) {
        studentSelect.innerHTML = '<option value="">Select Student</option>' +
            students.map(s => `<option value="${s.roll}">${s.roll} - ${escapeHtml(s.name)} (Sem ${s.semester})</option>`).join('');
    }
    
    if (courseSelect) {
        courseSelect.innerHTML = '<option value="">Select Course</option>' +
            courses.map(c => `<option value="${c.code}">${c.code} - ${escapeHtml(c.name)} (${c.credits} credits)</option>`).join('');
    }
}

// ==================== GRADE MANAGEMENT ====================
function addGrade() {
    const roll = document.getElementById('gradeRoll').value.trim();
    const courseCode = document.getElementById('gradeCode').value.trim().toUpperCase();
    const gradePoint = parseFloat(document.getElementById('gradeSelect').value);
    
    if (!roll || !courseCode) {
        showToast('Please enter roll number and course code!', 'error');
        return;
    }
    
    const student = students.find(s => s.roll === roll);
    const course = courses.find(c => c.code === courseCode);
    
    if (!student) {
        showToast('Student not found!', 'error');
        return;
    }
    
    if (!course) {
        showToast('Course not found!', 'error');
        return;
    }
    
    if (!student.courses?.includes(courseCode)) {
        showToast('Student is not enrolled in this course!', 'error');
        return;
    }
    
    if (!student.grades) student.grades = [];
    
    const existingGrade = student.grades.find(g => g.courseCode === courseCode);
    if (existingGrade) {
        existingGrade.gradePoint = gradePoint;
        showToast('Grade updated successfully!');
    } else {
        student.grades.push({ courseCode, gradePoint });
        showToast('Grade assigned successfully!');
    }
    
    updateStudentCGPA(roll);
    saveData();
    renderStudents();
    
    document.getElementById('gradeRoll').value = '';
    document.getElementById('gradeCode').value = '';
}

function showGradeReport() {
    const roll = document.getElementById('gradeReportRoll').value.trim();
    const student = students.find(s => s.roll === roll);
    
    if (!student) {
        document.getElementById('gradeReport').innerHTML = '<p class="error">Student not found!</p>';
        return;
    }
    
    let html = `
        <div class="grade-report-header">
            <h3>Grade Report - ${escapeHtml(student.name)}</h3>
            <p><strong>Roll Number:</strong> ${student.roll}</p>
            <p><strong>Department:</strong> ${escapeHtml(student.department)}</p>
            <p><strong>Semester:</strong> ${student.semester}</p>
            <p><strong>CGPA:</strong> <span class="cgpa-value">${student.cgpa.toFixed(2)}</span></p>
        </div>
    `;
    
    if (student.courses && student.courses.length > 0) {
        html += `
            <table class="grade-table">
                <thead>
                    <tr><th>Course Code</th><th>Course Name</th><th>Credits</th><th>Grade</th><th>Grade Points</th></tr>
                </thead>
                <tbody>
        `;
        
        student.courses.forEach(code => {
            const course = courses.find(c => c.code === code);
            const grade = student.grades?.find(g => g.courseCode === code);
            if (course) {
                html += `<tr>
                    <td>${course.code}</td>
                    <td>${escapeHtml(course.name)}</td>
                    <td>${course.credits}</td>
                    <td>${grade ? getGradeLetter(grade.gradePoint) : 'Not Graded'}</td>
                    <td>${grade ? grade.gradePoint : '-'}</td>
                </tr>`;
            }
        });
        
        html += `</tbody></table>`;
    } else {
        html += '<p>No courses enrolled.</p>';
    }
    
    document.getElementById('gradeReport').innerHTML = html;
}

function printGradeReport() {
    const roll = document.getElementById('gradeReportRoll').value;
    if (!roll) {
        showToast('Please enter a roll number!', 'error');
        return;
    }
    
    const student = students.find(s => s.roll === roll);
    if (!student) {
        showToast('Student not found!', 'error');
        return;
    }
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Grade Report - ${student.name}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; }
                h1 { color: #00c6ff; }
                .header { margin-bottom: 30px; border-bottom: 2px solid #00c6ff; padding-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { background: #00c6ff; color: white; padding: 10px; text-align: left; }
                td { border: 1px solid #ddd; padding: 10px; }
                .cgpa { font-size: 24px; font-weight: bold; color: #00c6ff; }
            </style>
        </head>
        <body>
            <h1>Student Grade Report</h1>
            <div class="header">
                <p><strong>Name:</strong> ${escapeHtml(student.name)}</p>
                <p><strong>Roll Number:</strong> ${student.roll}</p>
                <p><strong>Department:</strong> ${escapeHtml(student.department)}</p>
                <p><strong>Semester:</strong> ${student.semester}</p>
                <p><strong>CGPA:</strong> <span class="cgpa">${student.cgpa.toFixed(2)}</span></p>
            </div>
            <table>
                <thead><tr><th>Course Code</th><th>Course Name</th><th>Credits</th><th>Grade</th><th>Grade Points</th></tr></thead>
                <tbody>
                    ${student.courses?.map(code => {
                        const course = courses.find(c => c.code === code);
                        const grade = student.grades?.find(g => g.courseCode === code);
                        return `<tr>
                            <td>${code}</td>
                            <td>${course?.name || code}</td>
                            <td>${course?.credits || '-'}</td>
                            <td>${grade ? getGradeLetter(grade.gradePoint) : 'Not Graded'}</td>
                            <td>${grade ? grade.gradePoint : '-'}</td>
                        </tr>`;
                    }).join('') || '<tr><td colspan="5">No courses enrolled</td></tr>'}
                </tbody>
            </table>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// ==================== FEE MANAGEMENT ====================
function markPaid() {
    const roll = document.getElementById('feeRoll').value.trim();
    const student = students.find(s => s.roll === roll);
    
    if (student) {
        student.feePaid = true;
        saveData();
        renderStudents();
        renderDefaulters();
        updateDashboardStats();
        initAllCharts();
        showToast(`${student.name}'s fee marked as paid!`);
        document.getElementById('feeRoll').value = '';
    } else {
        showToast('Student not found!', 'error');
    }
}

function markUnpaid() {
    const roll = document.getElementById('feeRoll').value.trim();
    const student = students.find(s => s.roll === roll);
    
    if (student) {
        student.feePaid = false;
        saveData();
        renderStudents();
        renderDefaulters();
        updateDashboardStats();
        initAllCharts();
        showToast(`${student.name}'s fee marked as unpaid!`);
        document.getElementById('feeRoll').value = '';
    } else {
        showToast('Student not found!', 'error');
    }
}

function addFine() {
    const roll = document.getElementById('feeRoll').value.trim();
    const fine = parseFloat(document.getElementById('fineAmount').value);
    
    if (!fine || fine <= 0) {
        showToast('Please enter a valid fine amount!', 'error');
        return;
    }
    
    const student = students.find(s => s.roll === roll);
    if (student) {
        student.fineAmount = (student.fineAmount || 0) + fine;
        saveData();
        renderStudents();
        renderDefaulters();
        showToast(`Fine of ₹${fine} added to ${student.name}`);
        document.getElementById('fineAmount').value = '';
    } else {
        showToast('Student not found!', 'error');
    }
}

function renderDefaulters() {
    const tbody = document.querySelector('#defaultersTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    const defaulters = students.filter(s => !s.feePaid || (s.fineAmount && s.fineAmount > 0));
    
    defaulters.forEach(student => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${student.roll}</td>
            <td>${escapeHtml(student.name)}</td>
            <td>${escapeHtml(student.department)}</td>
            <td style="color: #ff6b6b;">₹${student.fineAmount || 0}</td>
            <td>
                <button onclick="document.getElementById('feeRoll').value='${student.roll}'; showSection('fees');" class="btn-small btn-primary">
                    <i class="fas fa-check"></i> Mark Paid
                </button>
            </td>
        `;
    });
}

function downloadFeeReceipt() {
    const student = students.find(s => s.roll === currentUser);
    if (!student) return;
    
    const totalFees = student.feePaid ? 0 : TUITION_FEE;
    const totalDue = totalFees + (student.fineAmount || 0);
    
    const receipt = `
        =================================
              FEE RECEIPT
        =================================
        Date: ${new Date().toLocaleString()}
        =================================
        Student Name: ${student.name}
        Roll Number: ${student.roll}
        Department: ${student.department}
        Semester: ${student.semester}
        =================================
        Tuition Fee: ₹${TUITION_FEE}
        Fee Status: ${student.feePaid ? 'PAID ✓' : 'UNPAID ✗'}
        Fine Amount: ₹${student.fineAmount || 0}
        =================================
        Total Due: ₹${totalDue}
        =================================
        Thank you!
    `;
    
    const blob = new Blob([receipt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fee_receipt_${student.roll}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Receipt downloaded!');
}

// ==================== STUDENT FUNCTIONS ====================
function showStudentDashboard() {
    const student = students.find(s => s.roll === currentUser);
    if (!student) return;
    
    document.getElementById('welcomeMsg').innerHTML = `
        <i class="fas fa-smile"></i> Hello, ${escapeHtml(student.name)}!
    `;
    
    document.getElementById('studentInfo').innerHTML = `
        <p><i class="fas fa-id-card"></i> <strong>Roll Number:</strong> ${student.roll}</p>
        <p><i class="fas fa-building"></i> <strong>Department:</strong> ${escapeHtml(student.department)}</p>
        <p><i class="fas fa-calendar"></i> <strong>Semester:</strong> ${student.semester}</p>
        <p><i class="fas fa-chart-line"></i> <strong>CGPA:</strong> <span style="color: ${student.cgpa >= 3.0 ? '#00c853' : student.cgpa >= 2.0 ? '#ffa000' : '#ff3d00'}; font-size: 20px;">${student.cgpa.toFixed(2)}</span></p>
    `;
    
    document.getElementById('cgpaDisplay').textContent = student.cgpa.toFixed(2);
    
    renderMyCourses();
    renderMyFees();
    showSection('studentDashboard');
    initStudentCharts();
}

function renderMyCourses() {
    const student = students.find(s => s.roll === currentUser);
    const tbody = document.querySelector('#myCourseTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (student.courses && student.courses.length > 0) {
        student.courses.forEach(code => {
            const course = courses.find(c => c.code === code);
            if (course) {
                const grade = student.grades?.find(g => g.courseCode === code);
                const gradeLetter = grade ? getGradeLetter(grade.gradePoint) : 'Not Graded';
                const gradePoint = grade ? grade.gradePoint : '-';
                const gradeColor = grade ? (grade.gradePoint >= 3.0 ? '#00c853' : grade.gradePoint >= 2.0 ? '#ffa000' : '#ff3d00') : '#ffffff';
                
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td>${course.code}</td>
                    <td>${escapeHtml(course.name)}</td>
                    <td>${course.credits}</td>
                    <td>${escapeHtml(course.teacher)}</td>
                    <td style="color: ${gradeColor}; font-weight: bold;">${gradeLetter}</td>
                    <td>${gradePoint}</td>
                `;
            }
        });
    } else {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No courses enrolled yet.</td></tr>';
    }
}

function renderMyFees() {
    const student = students.find(s => s.roll === currentUser);
    if (!student) return;
    
    const totalFees = student.feePaid ? 0 : TUITION_FEE;
    const totalDue = totalFees + (student.fineAmount || 0);
    
    document.getElementById('feeStatus').innerHTML = `
        <div class="fee-details">
            <h3>Fee Details</h3>
            <p><strong>Status:</strong> <span style="color: ${student.feePaid ? '#00c853' : '#ff3d00'};">${student.feePaid ? 'PAID ✓' : 'UNPAID ✗'}</span></p>
            <p><strong>Tuition Fee:</strong> ₹${TUITION_FEE}</p>
            <p><strong>Fine Amount:</strong> <span style="color: ${student.fineAmount > 0 ? '#ff3d00' : '#ffffff'};">₹${student.fineAmount || 0}</span></p>
            <p class="total-due"><strong>Total Due:</strong> ₹${totalDue}</p>
        </div>
    `;
}

function initStudentCharts() {
    const student = students.find(s => s.roll === currentUser);
    if (!student) return;
    
    const semCtx = document.getElementById('semesterGPAChart')?.getContext('2d');
    if (semCtx) {
        if (chartInstances.semesterGPA) chartInstances.semesterGPA.destroy();
        
        const semesterData = [];
        for (let i = 1; i <= student.semester; i++) {
            semesterData.push({
                semester: i,
                gpa: student.cgpa * (i / student.semester)
            });
        }
        
        chartInstances.semesterGPA = new Chart(semCtx, {
            type: 'line',
            data: {
                labels: semesterData.map(d => `Semester ${d.semester}`),
                datasets: [{
                    label: 'GPA Progress',
                    data: semesterData.map(d => d.gpa),
                    borderColor: '#00c6ff',
                    backgroundColor: 'rgba(0, 198, 255, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#00c6ff',
                    pointBorderColor: '#ffffff',
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: { 
                        beginAtZero: true, 
                        max: 4,
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    },
                    x: { 
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { labels: { color: '#ffffff' } },
                    tooltip: { callbacks: { label: (ctx) => `GPA: ${ctx.raw.toFixed(2)}` } }
                }
            }
        });
    }
}

// ==================== HELPER FUNCTIONS ====================
function downloadCSV(headers, rows, filename) {
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Export completed!');
}

function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    
    switch(id) {
        case 'dashboard':
            updateDashboardStats();
            initAllCharts();
            break;
        case 'students':
            renderStudents();
            break;
        case 'courses':
            renderCourses();
            updateCourseStats();
            break;
        case 'fees':
            renderDefaulters();
            initAllCharts();
            break;
        case 'allocate':
            updateQuickAllocate();
            break;
        case 'studentDashboard':
            showStudentDashboard();
            break;
        case 'myCourses':
            renderMyCourses();
            break;
        case 'myFees':
            renderMyFees();
            break;
    }
}

// ==================== INITIALIZATION ====================
function addSampleData() {
    if (students.length === 0 && courses.length === 0) {
        courses.push(
            { code: 'CS101', name: 'Computer Programming', credits: 4, teacher: 'Dr. Smith' },
            { code: 'CS201', name: 'Data Structures', credits: 4, teacher: 'Dr. Johnson' },
            { code: 'MA101', name: 'Mathematics I', credits: 3, teacher: 'Prof. Williams' },
            { code: 'PH101', name: 'Physics I', credits: 3, teacher: 'Dr. Brown' },
            { code: 'ENG101', name: 'English Composition', credits: 2, teacher: 'Prof. Davis' }
        );
        
        students.push(
            { roll: 'CS001', name: 'John Doe', department: 'Computer Science', semester: 3, courses: ['CS101', 'CS201'], grades: [{courseCode: 'CS101', gradePoint: 3.7}, {courseCode: 'CS201', gradePoint: 3.3}], feePaid: true, fineAmount: 0 },
            { roll: 'CS002', name: 'Jane Smith', department: 'Computer Science', semester: 5, courses: ['CS201', 'MA101'], grades: [{courseCode: 'CS201', gradePoint: 4.0}, {courseCode: 'MA101', gradePoint: 3.3}], feePaid: false, fineAmount: 500 },
            { roll: 'EC001', name: 'Bob Wilson', department: 'Electronics', semester: 3, courses: ['PH101', 'MA101'], grades: [{courseCode: 'PH101', gradePoint: 3.0}, {courseCode: 'MA101', gradePoint: 2.7}], feePaid: true, fineAmount: 0 },
            { roll: 'CS003', name: 'Alice Johnson', department: 'Computer Science', semester: 2, courses: ['CS101'], grades: [{courseCode: 'CS101', gradePoint: 3.0}], feePaid: false, fineAmount: 0 },
            { roll: 'ME001', name: 'Charlie Brown', department: 'Mechanical', semester: 4, courses: ['MA101', 'PH101'], grades: [{courseCode: 'MA101', gradePoint: 2.7}, {courseCode: 'PH101', gradePoint: 2.3}], feePaid: true, fineAmount: 200 }
        );
        
        students.forEach(s => {
            s.cgpa = calculateCGPA(s);
        });
        
        saveData();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    addSampleData();
    
    renderStudents();
    renderCourses();
    updateCourseStats();
    renderDefaulters();
    updateQuickAllocate();
    
    // Mobile menu toggle
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('show');
        });
    }
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('sidebar');
        const menuToggleBtn = document.getElementById('menuToggle');
        if (window.innerWidth <= 768 && sidebar.classList.contains('show')) {
            if (!sidebar.contains(e.target) && !menuToggleBtn.contains(e.target)) {
                sidebar.classList.remove('show');
            }
        }
    });
});
