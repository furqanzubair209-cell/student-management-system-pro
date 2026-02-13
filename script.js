const MAX_CREDITS = 18;
const GRADE_POINTS = {
    'A+': 4.0, 'A': 3.7, 'B+': 3.3, 'B': 3.0,
    'C+': 2.7, 'C': 2.3, 'D': 2.0, 'F': 0.0
};

let students = JSON.parse(localStorage.getItem("students")) || [];
let courses = JSON.parse(localStorage.getItem("courses")) || [];
let currentUser = null;

// Chart instances
let studentsChart, coursesChart, performanceChart, deptChart, feeChart;

// ========== UTILITY FUNCTIONS ==========
function saveData() {
    localStorage.setItem("students", JSON.stringify(students));
    localStorage.setItem("courses", JSON.stringify(courses));
}

function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.innerText = msg;
    toast.style.display = "block";
    setTimeout(() => toast.style.display = "none", 2000);
}

function showSection(id) {
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    document.getElementById(id).classList.add("active");
    
    if (id === 'courses') {
        searchCourse();
        updateCourseStats();
    } else if (id === 'students') {
        renderStudents();
    } else if (id === 'dashboard') {
        updateCharts();
    } else if (id === 'fees') {
        renderDefaulters();
        updateCharts();
    } else if (id === 'allocate') {
        updateQuickAllocate();
    }
}

// Mobile menu toggle
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            document.getElementById('sidebar').classList.toggle('show');
        });
    }
});

// ========== AUTHENTICATION ==========
function login() {
    const u = document.getElementById("username").value;
    const p = document.getElementById("password").value;
    
    if (u === "admin" && p === "admin123") {
        currentUser = "admin";
        document.getElementById("loginPage").classList.add("hidden");
        document.getElementById("app").classList.remove("hidden");
        document.getElementById("panelTitle").innerText = "Admin Panel";
        document.getElementById("adminMenu").classList.remove("hidden");
        document.getElementById("studentMenu").classList.add("hidden");
        document.getElementById("studentPanel").classList.add("hidden");
        document.getElementById("adminPanel").classList.remove("hidden");
        
        updateDashboard();
        renderStudents();
        renderCourses();
        updateCourseStats();
        initCharts();
        showToast("Welcome Admin!");
    } else {
        const s = students.find(st => st.roll === u);
        if (s) {
            currentUser = s.roll;
            document.getElementById("loginPage").classList.add("hidden");
            document.getElementById("app").classList.remove("hidden");
            document.getElementById("panelTitle").innerText = "Student Panel";
            document.getElementById("adminMenu").classList.add("hidden");
            document.getElementById("studentMenu").classList.remove("hidden");
            document.getElementById("adminPanel").classList.add("hidden");
            document.getElementById("studentPanel").classList.remove("hidden");
            
            showStudentDashboard();
            showToast(`Welcome ${s.name}!`);
        } else {
            showToast("Invalid login credentials!");
        }
    }
}

function logout() {
    location.reload();
}

// ========== CGPA CALCULATION ==========
function calculateCGPA(student) {
    if (!student.grades || student.grades.length === 0) return 0;
    
    let totalPoints = 0;
    let totalCredits = 0;
    
    student.grades.forEach(grade => {
        const course = courses.find(c => c.code === grade.courseCode);
        if (course) {
            totalPoints += grade.gradePoint * course.credits;
            totalCredits += course.credits;
        }
    });
    
    return totalCredits > 0 ? totalPoints / totalCredits : 0;
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

// ========== ADMIN FUNCTIONS ==========
function updateDashboard() {
    document.getElementById("totalStudents").innerText = students.length;
    document.getElementById("totalCourses").innerText = courses.length;
    updateCharts();
}

function addStudent() {
    const roll = document.getElementById("roll").value.trim();
    const name = document.getElementById("name").value.trim();
    const dept = document.getElementById("dept").value.trim();
    const semester = document.getElementById("semester").value;
    
    if (!roll || !name || !dept || !semester) {
        showToast("Please fill all fields!");
        return;
    }
    
    if (students.find(s => s.roll === roll)) {
        showToast("Student already exists!");
        return;
    }
    
    students.push({
        roll,
        name,
        department: dept,
        semester: parseInt(semester),
        courses: [],
        grades: [],
        cgpa: 0,
        feePaid: false,
        fineAmount: 0
    });
    
    saveData();
    renderStudents();
    updateDashboard();
    updateCharts();
    showToast("Student added successfully!");
    
    // Clear inputs
    document.getElementById("roll").value = "";
    document.getElementById("name").value = "";
    document.getElementById("dept").value = "";
    document.getElementById("semester").value = "";
}

function renderStudents() {
    const tbody = document.querySelector("#studentTable tbody");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    
    students.forEach(s => {
        tbody.innerHTML += `<tr>
            <td>${s.roll}</td>
            <td>${s.name}</td>
            <td>${s.department}</td>
            <td>${s.semester}</td>
            <td style="color: ${s.cgpa >= 3.0 ? '#00ff00' : s.cgpa >= 2.0 ? '#ffff00' : '#ff0000'}; font-weight: bold;">${s.cgpa.toFixed(2)}</td>
            <td style="color: ${s.feePaid ? '#00ff00' : '#ff0000'};">${s.feePaid ? "Paid ✓" : "Unpaid ✗"}</td>
            <td>₹${s.fineAmount || 0}</td>
            <td>
                <button onclick="editStudent('${s.roll}')" style="background:#00c853; padding:5px 10px;">Edit</button>
                <button onclick="deleteStudent('${s.roll}')" style="background:#ff3d00; padding:5px 10px;">Delete</button>
                <button onclick="viewStudentDetails('${s.roll}')" style="background:#0072ff; padding:5px 10px;">View</button>
            </td>
        </tr>`;
    });
}

function deleteStudent(roll) {
    if (confirm("Are you sure you want to delete this student? This action cannot be undone.")) {
        students = students.filter(s => s.roll !== roll);
        saveData();
        renderStudents();
        updateDashboard();
        updateCharts();
        showToast("Student deleted successfully!");
    }
}

function editStudent(roll) {
    const student = students.find(s => s.roll === roll);
    if (student) {
        document.getElementById("roll").value = student.roll;
        document.getElementById("name").value = student.name;
        document.getElementById("dept").value = student.department;
        document.getElementById("semester").value = student.semester;
        showSection('students');
        showToast("Edit student details and click Add to update");
    }
}

function viewStudentDetails(roll) {
    const student = students.find(s => s.roll === roll);
    if (!student) return;
    
    let html = `<h2>Student Details: ${student.name} (${student.roll})</h2>`;
    html += `<p><strong>Department:</strong> ${student.department}</p>`;
    html += `<p><strong>Semester:</strong> ${student.semester}</p>`;
    html += `<p><strong>CGPA:</strong> ${student.cgpa.toFixed(2)}</p>`;
    html += `<p><strong>Fee Status:</strong> ${student.feePaid ? 'Paid' : 'Unpaid'}</p>`;
    html += `<p><strong>Fine Amount:</strong> ₹${student.fineAmount || 0}</p>`;
    
    html += `<h3>Enrolled Courses</h3>`;
    if (student.courses && student.courses.length > 0) {
        html += '<table><thead><tr><th>Code</th><th>Course</th><th>Credits</th><th>Grade</th></tr></thead><tbody>';
        student.courses.forEach(code => {
            const course = courses.find(c => c.code === code);
            const grade = student.grades?.find(g => g.courseCode === code);
            if (course) {
                html += `<tr>
                    <td>${course.code}</td>
                    <td>${course.name}</td>
                    <td>${course.credits}</td>
                    <td>${grade ? getGradeLetter(grade.gradePoint) : 'Not Graded'}</td>
                </tr>`;
            }
        });
        html += '</tbody></table>';
    } else {
        html += '<p>No courses enrolled</p>';
    }
    
    // Show in modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            ${html}
        </div>
    `;
    document.body.appendChild(modal);
}

function searchStudent() {
    const searchTerm = document.getElementById("searchRoll").value.toLowerCase();
    const tbody = document.querySelector("#studentTable tbody");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    
    students.filter(s => 
        s.roll.toLowerCase().includes(searchTerm) || 
        s.name.toLowerCase().includes(searchTerm) ||
        s.department.toLowerCase().includes(searchTerm)
    ).forEach(s => {
        tbody.innerHTML += `<tr>
            <td>${s.roll}</td>
            <td>${s.name}</td>
            <td>${s.department}</td>
            <td>${s.semester}</td>
            <td style="color: ${s.cgpa >= 3.0 ? '#00ff00' : s.cgpa >= 2.0 ? '#ffff00' : '#ff0000'};">${s.cgpa.toFixed(2)}</td>
            <td style="color: ${s.feePaid ? '#00ff00' : '#ff0000'};">${s.feePaid ? "Paid" : "Unpaid"}</td>
            <td>₹${s.fineAmount || 0}</td>
            <td>
                <button onclick="editStudent('${s.roll}')" style="background:#00c853;">Edit</button>
                <button onclick="deleteStudent('${s.roll}')" style="background:#ff3d00;">Delete</button>
                <button onclick="viewStudentDetails('${s.roll}')" style="background:#0072ff;">View</button>
            </td>
        </tr>`;
    });
}

function exportStudents() {
    let csv = "Roll,Name,Department,Semester,CGPA,Fee Status,Fine Amount\n";
    
    students.forEach(s => {
        csv += `${s.roll},${s.name},${s.department},${s.semester},${s.cgpa.toFixed(2)},${s.feePaid ? 'Paid' : 'Unpaid'},${s.fineAmount || 0}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students.csv';
    a.click();
    showToast("Students exported successfully!");
}

// ========== COURSE MANAGEMENT ==========
function addCourse() {
    const code = document.getElementById("courseCode").value.trim();
    const name = document.getElementById("courseName").value.trim();
    const credits = parseInt(document.getElementById("credits").value);
    const teacher = document.getElementById("teacher").value.trim();
    
    if (!code || !name || !credits || !teacher) {
        showToast("Please fill all fields!");
        return;
    }
    
    if (courses.find(c => c.code === code)) {
        showToast("Course already exists!");
        return;
    }
    
    courses.push({
        code,
        name,
        credits,
        teacher
    });
    
    saveData();
    renderCourses();
    searchCourse();
    updateCourseStats();
    updateDashboard();
    updateCharts();
    showToast("Course added successfully!");
    
    // Clear inputs
    document.getElementById("courseCode").value = "";
    document.getElementById("courseName").value = "";
    document.getElementById("credits").value = "";
    document.getElementById("teacher").value = "";
}

function renderCourses() {
    const tbody = document.querySelector("#courseTable tbody");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    
    courses.forEach(c => {
        const enrolledCount = students.filter(s => s.courses?.includes(c.code)).length;
        
        tbody.innerHTML += `<tr>
            <td><input type="checkbox" class="course-checkbox" value="${c.code}" onchange="updateSelectAll()"></td>
            <td>${c.code}</td>
            <td>${c.name}</td>
            <td>${c.credits}</td>
            <td>${c.teacher}</td>
            <td>${enrolledCount}</td>
            <td>
                <button onclick="deleteCourse('${c.code}')" style="background:#ff3d00; padding:5px 10px;">Delete</button>
                <button onclick="editCourse('${c.code}')" style="background:#00c853; padding:5px 10px;">Edit</button>
                <button onclick="viewEnrolledStudents('${c.code}')" style="background:#0072ff; padding:5px 10px;">View</button>
            </td>
        </tr>`;
    });
}

function deleteCourse(code) {
    if (confirm("Are you sure you want to delete this course?\nThis will remove the course from all students and their grades.")) {
        // Remove course from all students
        students.forEach(student => {
            if (student.courses) {
                student.courses = student.courses.filter(c => c !== code);
            }
            if (student.grades) {
                student.grades = student.grades.filter(g => g.courseCode !== code);
            }
            // Recalculate CGPA for affected students
            student.cgpa = calculateCGPA(student);
        });
        
        // Remove the course
        courses = courses.filter(c => c.code !== code);
        
        // Save changes
        saveData();
        
        // Update UI
        renderCourses();
        searchCourse();
        updateCourseStats();
        renderStudents();
        updateDashboard();
        updateCharts();
        
        showToast("Course deleted successfully!");
    }
}

function editCourse(code) {
    const course = courses.find(c => c.code === code);
    if (course) {
        document.getElementById("courseCode").value = course.code;
        document.getElementById("courseName").value = course.name;
        document.getElementById("credits").value = course.credits;
        document.getElementById("teacher").value = course.teacher;
        showSection('courses');
        showToast("Edit course details and click Add to update");
    }
}

function deleteMultipleCourses() {
    const selectedCourses = [];
    document.querySelectorAll('.course-checkbox:checked').forEach(cb => {
        selectedCourses.push(cb.value);
    });
    
    if (selectedCourses.length === 0) {
        showToast("No courses selected!");
        return;
    }
    
    if (confirm(`Are you sure you want to delete ${selectedCourses.length} course(s)?`)) {
        selectedCourses.forEach(code => {
            // Remove from students
            students.forEach(student => {
                if (student.courses) {
                    student.courses = student.courses.filter(c => c !== code);
                }
                if (student.grades) {
                    student.grades = student.grades.filter(g => g.courseCode !== code);
                }
                student.cgpa = calculateCGPA(student);
            });
            
            // Remove courses
            courses = courses.filter(c => c.code !== code);
        });
        
        saveData();
        renderCourses();
        searchCourse();
        updateCourseStats();
        renderStudents();
        updateDashboard();
        updateCharts();
        showToast(`${selectedCourses.length} course(s) deleted!`);
    }
}

function searchCourse() {
    const searchTerm = document.getElementById('searchCourse')?.value.toLowerCase() || '';
    const tbody = document.querySelector("#courseTable tbody");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    
    courses.filter(c => 
        c.code.toLowerCase().includes(searchTerm) || 
        c.name.toLowerCase().includes(searchTerm) ||
        c.teacher.toLowerCase().includes(searchTerm)
    ).forEach(c => {
        const enrolledCount = students.filter(s => s.courses?.includes(c.code)).length;
        
        tbody.innerHTML += `<tr>
            <td><input type="checkbox" class="course-checkbox" value="${c.code}" onchange="updateSelectAll()"></td>
            <td>${c.code}</td>
            <td>${c.name}</td>
            <td>${c.credits}</td>
            <td>${c.teacher}</td>
            <td>${enrolledCount}</td>
            <td>
                <button onclick="deleteCourse('${c.code}')" style="background:#ff3d00; padding:5px 10px;">Delete</button>
                <button onclick="editCourse('${c.code}')" style="background:#00c853; padding:5px 10px;">Edit</button>
                <button onclick="viewEnrolledStudents('${c.code}')" style="background:#0072ff; padding:5px 10px;">View</button>
            </td>
        </tr>`;
    });
    
    updateCourseStats();
}

function filterCoursesByDept() {
    searchCourse();
}

function viewEnrolledStudents(courseCode) {
    const course = courses.find(c => c.code === courseCode);
    const enrolledStudents = students.filter(s => s.courses?.includes(courseCode));
    
    let html = `<h2>Students Enrolled in ${course.name} (${course.code})</h2>`;
    html += `<p style="font-size: 18px;">Total: <strong>${enrolledStudents.length}</strong> students</p>`;
    
    if (enrolledStudents.length > 0) {
        html += '<table><thead><tr><th>Roll</th><th>Name</th><th>Department</th><th>Semester</th><th>CGPA</th><th>Action</th></tr></thead><tbody>';
        
        enrolledStudents.forEach(s => {
            const grade = s.grades?.find(g => g.courseCode === courseCode);
            const gradeLetter = grade ? getGradeLetter(grade.gradePoint) : 'Not Graded';
            
            html += `<tr>
                <td>${s.roll}</td>
                <td>${s.name}</td>
                <td>${s.department}</td>
                <td>${s.semester}</td>
                <td>${s.cgpa.toFixed(2)} (${gradeLetter})</td>
                <td>
                    <button onclick="removeCourseFromStudent('${s.roll}', '${courseCode}')" style="background:#ff3d00;">Remove</button>
                </td>
            </tr>`;
        });
        
        html += '</tbody></table>';
    } else {
        html += '<p>No students enrolled in this course.</p>';
    }
    
    // Show in modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            ${html}
        </div>
    `;
    document.body.appendChild(modal);
}

function removeCourseFromStudent(roll, courseCode) {
    if (confirm("Remove this course from student?")) {
        const student = students.find(s => s.roll === roll);
        if (student) {
            // Remove from enrolled courses
            student.courses = student.courses.filter(c => c !== courseCode);
            
            // Remove grades for this course
            if (student.grades) {
                student.grades = student.grades.filter(g => g.courseCode !== courseCode);
            }
            
            // Recalculate CGPA
            student.cgpa = calculateCGPA(student);
            
            saveData();
            renderStudents();
            viewEnrolledStudents(courseCode); // Refresh the view
            showToast("Course removed from student!");
        }
    }
}

function updateCourseStats() {
    const totalCourses = courses.length;
    const totalCredits = courses.reduce((sum, c) => sum + (c.credits || 0), 0);
    const avgCredits = totalCourses > 0 ? (totalCredits / totalCourses).toFixed(1) : 0;
    
    const totalCoursesEl = document.getElementById('totalCoursesCount');
    const totalCreditsEl = document.getElementById('totalCreditsCount');
    const avgCreditsEl = document.getElementById('avgCredits');
    
    if (totalCoursesEl) totalCoursesEl.innerText = totalCourses;
    if (totalCreditsEl) totalCreditsEl.innerText = totalCredits;
    if (avgCreditsEl) avgCreditsEl.innerText = avgCredits;
}

function toggleSelectAll(checkbox) {
    document.querySelectorAll('.course-checkbox').forEach(cb => {
        cb.checked = checkbox.checked;
    });
}

function updateSelectAll() {
    const checkboxes = document.querySelectorAll('.course-checkbox');
    const selectAll = document.getElementById('selectAllCourses');
    if (selectAll) {
        selectAll.checked = Array.from(checkboxes).every(cb => cb.checked);
        selectAll.indeterminate = Array.from(checkboxes).some(cb => cb.checked) && 
                                 !Array.from(checkboxes).every(cb => cb.checked);
    }
}

function exportCourses() {
    let csv = "Code,Name,Credits,Teacher,Students Enrolled\n";
    
    courses.forEach(c => {
        const enrolledCount = students.filter(s => s.courses?.includes(c.code)).length;
        csv += `${c.code},${c.name},${c.credits},${c.teacher},${enrolledCount}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'courses.csv';
    a.click();
    showToast("Courses exported successfully!");
}

// ========== COURSE ALLOCATION ==========
function allocateCourse() {
    const roll = document.getElementById("allocRoll").value.trim();
    const code = document.getElementById("allocCode").value.trim();
    
    if (!roll || !code) {
        showToast("Please enter both roll number and course code!");
        return;
    }
    
    const student = students.find(s => s.roll === roll);
    const course = courses.find(c => c.code === code);
    
    if (!student) {
        showToast("Student not found!");
        return;
    }
    
    if (!course) {
        showToast("Course not found!");
        return;
    }
    
    if (!student.courses) student.courses = [];
    
    if (student.courses.includes(code)) {
        showToast("Course already allocated to this student!");
        return;
    }
    
    const totalCredits = student.courses
        .map(c => courses.find(x => x.code === c)?.credits || 0)
        .reduce((a, b) => a + b, 0);
    
    if (totalCredits + course.credits > MAX_CREDITS) {
        showToast(`Credit limit exceeded! Max credits: ${MAX_CREDITS}`);
        return;
    }
    
    student.courses.push(code);
    saveData();
    
    document.getElementById("allocRoll").value = "";
    document.getElementById("allocCode").value = "";
    
    updateQuickAllocate();
    showToast(`Course allocated to ${student.name} successfully!`);
}

function quickAllocate() {
    const studentSelect = document.getElementById('quickStudent');
    const courseSelect = document.getElementById('quickCourse');
    
    if (!studentSelect.value || !courseSelect.value) {
        showToast("Please select both student and course!");
        return;
    }
    
    document.getElementById('allocRoll').value = studentSelect.value;
    document.getElementById('allocCode').value = courseSelect.value;
    allocateCourse();
}

function updateQuickAllocate() {
    const studentSelect = document.getElementById('quickStudent');
    const courseSelect = document.getElementById('quickCourse');
    
    if (studentSelect) {
        studentSelect.innerHTML = '<option value="">Select Student</option>';
        students.forEach(s => {
            studentSelect.innerHTML += `<option value="${s.roll}">${s.roll} - ${s.name}</option>`;
        });
    }
    
    if (courseSelect) {
        courseSelect.innerHTML = '<option value="">Select Course</option>';
        courses.forEach(c => {
            courseSelect.innerHTML += `<option value="${c.code}">${c.code} - ${c.name} (${c.credits} credits)</option>`;
        });
    }
}

// ========== GRADE MANAGEMENT ==========
function addGrade() {
    const roll = document.getElementById("gradeRoll").value.trim();
    const courseCode = document.getElementById("gradeCode").value.trim();
    const gradePoint = parseFloat(document.getElementById("gradeSelect").value);
    
    if (!roll || !courseCode) {
        showToast("Please enter roll number and course code!");
        return;
    }
    
    const student = students.find(s => s.roll === roll);
    const course = courses.find(c => c.code === courseCode);
    
    if (!student) {
        showToast("Student not found!");
        return;
    }
    
    if (!course) {
        showToast("Course not found!");
        return;
    }
    
    if (!student.courses || !student.courses.includes(courseCode)) {
        showToast("Student is not enrolled in this course!");
        return;
    }
    
    if (!student.grades) student.grades = [];
    
    // Update or add grade
    const existingGrade = student.grades.find(g => g.courseCode === courseCode);
    if (existingGrade) {
        existingGrade.gradePoint = gradePoint;
        showToast("Grade updated successfully!");
    } else {
        student.grades.push({ courseCode, gradePoint });
        showToast("Grade assigned successfully!");
    }
    
    // Update CGPA
    updateStudentCGPA(roll);
    
    saveData();
    renderStudents();
    document.getElementById("gradeRoll").value = "";
    document.getElementById("gradeCode").value = "";
}

function showGradeReport() {
    const roll = document.getElementById("gradeReportRoll").value.trim();
    const student = students.find(s => s.roll === roll);
    
    if (!student) {
        document.getElementById("gradeReport").innerHTML = "<p style='color: #ff6b6b;'>Student not found!</p>";
        return;
    }
    
    let html = `<div style="background: rgba(0,198,255,0.1); padding: 20px; border-radius: 10px;">`;
    html += `<h3 style="color: #00c6ff; margin-bottom: 15px;">Grade Report - ${student.name} (${student.roll})</h3>`;
    html += `<p style="font-size: 18px;"><strong>CGPA:</strong> <span style="color: ${student.cgpa >= 3.0 ? '#00ff00' : student.cgpa >= 2.0 ? '#ffff00' : '#ff0000'}; font-size: 24px;">${student.cgpa.toFixed(2)}</span></p>`;
    
    if (student.courses && student.courses.length > 0) {
        html += '<table><thead><tr><th>Course Code</th><th>Course Name</th><th>Credits</th><th>Grade</th><th>Grade Points</th></tr></thead><tbody>';
        
        student.courses.forEach(code => {
            const course = courses.find(c => c.code === code);
            const grade = student.grades?.find(g => g.courseCode === code);
            
            if (course) {
                html += `<tr>
                    <td>${course.code}</td>
                    <td>${course.name}</td>
                    <td>${course.credits}</td>
                    <td>${grade ? getGradeLetter(grade.gradePoint) : 'Not Graded'}</td>
                    <td>${grade ? grade.gradePoint : '-'}</td>
                </tr>`;
            }
        });
        
        html += '</tbody></table>';
    } else {
        html += '<p>No courses enrolled.</p>';
    }
    
    html += '</div>';
    document.getElementById("gradeReport").innerHTML = html;
}

function printGradeReport() {
    const roll = document.getElementById("gradeReportRoll").value;
    if (!roll) {
        showToast("Please enter a roll number!");
        return;
    }
    
    const student = students.find(s => s.roll === roll);
    if (!student) {
        showToast("Student not found!");
        return;
    }
    
    let printContent = `<html>
        <head>
            <title>Grade Report - ${student.name}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 30px; }
                h1 { color: #00c6ff; }
                .header { margin-bottom: 30px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { background: #00c6ff; color: white; padding: 10px; }
                td { border: 1px solid #ddd; padding: 10px; }
                .cgpa { font-size: 24px; font-weight: bold; color: #00c6ff; }
            </style>
        </head>
        <body>
            <h1>Student Grade Report</h1>
            <div class="header">
                <p><strong>Name:</strong> ${student.name}</p>
                <p><strong>Roll Number:</strong> ${student.roll}</p>
                <p><strong>Department:</strong> ${student.department}</p>
                <p><strong>Semester:</strong> ${student.semester}</p>
                <p><strong>CGPA:</strong> <span class="cgpa">${student.cgpa.toFixed(2)}</span></p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Course Code</th>
                        <th>Course Name</th>
                        <th>Credits</th>
                        <th>Grade</th>
                        <th>Grade Points</th>
                    </tr>
                </thead>
                <tbody>`;
    
    student.courses?.forEach(code => {
        const course = courses.find(c => c.code === code);
        const grade = student.grades?.find(g => g.courseCode === code);
        
        if (course) {
            printContent += `<tr>
                <td>${course.code}</td>
                <td>${course.name}</td>
                <td>${course.credits}</td>
                <td>${grade ? getGradeLetter(grade.gradePoint) : 'Not Graded'}</td>
                <td>${grade ? grade.gradePoint : '-'}</td>
            </tr>`;
        }
    });
    
    printContent += `</tbody></table></body></html>`;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
}

// ========== FEES MANAGEMENT ==========
function markPaid() {
    const roll = document.getElementById("feeRoll").value.trim();
    const student = students.find(s => s.roll === roll);
    
    if (student) {
        student.feePaid = true;
        saveData();
        renderStudents();
        renderDefaulters();
        updateCharts();
        showToast(`${student.name}'s fee marked as paid`);
    } else {
        showToast("Student not found!");
    }
}

function markUnpaid() {
    const roll = document.getElementById("feeRoll").value.trim();
    const student = students.find(s => s.roll === roll);
    
    if (student) {
        student.feePaid = false;
        saveData();
        renderStudents();
        renderDefaulters();
        updateCharts();
        showToast(`${student.name}'s fee marked as unpaid`);
    } else {
        showToast("Student not found!");
    }
}

function addFine() {
    const roll = document.getElementById("feeRoll").value.trim();
    const fine = parseFloat(document.getElementById("fineAmount").value);
    
    if (!fine || fine <= 0) {
        showToast("Please enter a valid fine amount!");
        return;
    }
    
    const student = students.find(s => s.roll === roll);
    if (student) {
        student.fineAmount = (student.fineAmount || 0) + fine;
        saveData();
        renderStudents();
        renderDefaulters();
        showToast(`Fine of ₹${fine} added to ${student.name}`);
        document.getElementById("fineAmount").value = "";
    } else {
        showToast("Student not found!");
    }
}

function renderDefaulters() {
    const tbody = document.querySelector("#defaultersTable tbody");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    
    const defaulters = students.filter(s => !s.feePaid || (s.fineAmount && s.fineAmount > 0));
    
    defaulters.forEach(s => {
        tbody.innerHTML += `<tr>
            <td>${s.roll}</td>
            <td>${s.name}</td>
            <td>${s.department}</td>
            <td style="color: #ff6b6b;">₹${s.fineAmount || 0}</td>
            <td>
                <button onclick="document.getElementById('feeRoll').value='${s.roll}'; showSection('fees');" style="background:#00c6ff;">Mark Paid</button>
            </td>
        </tr>`;
    });
}

function downloadFeeReceipt() {
    const student = students.find(s => s.roll === currentUser);
    if (!student) return;
    
    let receipt = `FEE RECEIPT\n`;
    receipt += `============\n\n`;
    receipt += `Date: ${new Date().toLocaleDateString()}\n`;
    receipt += `Student: ${student.name} (${student.roll})\n`;
    receipt += `Department: ${student.department}\n`;
    receipt += `Semester: ${student.semester}\n\n`;
    receipt += `Fee Status: ${student.feePaid ? 'PAID ✓' : 'UNPAID ✗'}\n`;
    receipt += `Fine Amount: ₹${student.fineAmount || 0}\n\n`;
    receipt += `Total Amount: ₹${student.feePaid ? '0' : '5000'} + ₹${student.fineAmount || 0}\n`;
    receipt += `============\n`;
    receipt += `Thank you!\n`;
    
    const blob = new Blob([receipt], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fee_receipt_${student.roll}.txt`;
    a.click();
    showToast("Receipt downloaded!");
}

// ========== STUDENT FUNCTIONS ==========
function showStudentDashboard() {
    const student = students.find(s => s.roll === currentUser);
    if (!student) return;
    
    document.getElementById("studentInfo").innerHTML = `
        <div style="text-align: left;">
            <p style="font-size: 20px;"><strong>${student.name}</strong></p>
            <p><strong>Roll:</strong> ${student.roll}</p>
            <p><strong>Department:</strong> ${student.department}</p>
            <p><strong>Semester:</strong> ${student.semester}</p>
            <p><strong>CGPA:</strong> <span style="color: ${student.cgpa >= 3.0 ? '#00ff00' : student.cgpa >= 2.0 ? '#ffff00' : '#ff0000'}; font-size: 24px;">${student.cgpa.toFixed(2)}</span></p>
        </div>
    `;
    
    document.getElementById("cgpaDisplay").innerHTML = `CGPA: ${student.cgpa.toFixed(2)}`;
    
    renderMyCourses();
    renderMyFees();
    showSection('studentDashboard');
    initStudentCharts();
}

function renderMyCourses() {
    const student = students.find(s => s.roll === currentUser);
    const tbody = document.querySelector("#myCourseTable tbody");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    
    if (student.courses && student.courses.length > 0) {
        student.courses.forEach(code => {
            const c = courses.find(cr => cr.code === code);
            if (c) {
                const grade = student.grades?.find(g => g.courseCode === code);
                const gradeLetter = grade ? getGradeLetter(grade.gradePoint) : 'Not Graded';
                const gradePoint = grade ? grade.gradePoint : '-';
                
                tbody.innerHTML += `<tr>
                    <td>${c.code}</td>
                    <td>${c.name}</td>
                    <td>${c.credits}</td>
                    <td>${c.teacher}</td>
                    <td style="color: ${grade ? grade.gradePoint >= 3.0 ? '#00ff00' : grade.gradePoint >= 2.0 ? '#ffff00' : '#ff0000' : '#ffffff'};">${gradeLetter}</td>
                    <td>${gradePoint}</td>
                </tr>`;
            }
        });
    } else {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No courses enrolled yet.</td></tr>';
    }
}

function renderMyFees() {
    const student = students.find(s => s.roll === currentUser);
    if (!student) return;
    
    const totalFees = student.feePaid ? 0 : 5000;
    const totalDue = totalFees + (student.fineAmount || 0);
    
    document.getElementById("feeStatus").innerHTML = `
        <div style="text-align: left;">
            <p style="font-size: 20px;"><strong>Fee Status</strong></p>
            <p>Status: <span style="color: ${student.feePaid ? '#00ff00' : '#ff0000'}; font-weight: bold;">${student.feePaid ? "PAID ✓" : "UNPAID ✗"}</span></p>
            <p>Tuition Fee: <span style="color: ${student.feePaid ? '#00ff00' : '#ff0000'};">₹${totalFees}</span></p>
            <p>Fine Amount: <span style="color: ${student.fineAmount > 0 ? '#ff0000' : '#ffffff'};">₹${student.fineAmount || 0}</span></p>
            <p style="font-size: 18px;"><strong>Total Due: ₹${totalDue}</strong></p>
        </div>
    `;
}

// ========== CHART FUNCTIONS ==========
function initCharts() {
    // Students Chart
    const studentsCtx = document.getElementById('studentsChart')?.getContext('2d');
    if (studentsCtx) {
        studentsChart = new Chart(studentsCtx, {
            type: 'doughnut',
            data: {
                labels: ['Total Students'],
                datasets: [{
                    data: [students.length, 1],
                    backgroundColor: ['#00c6ff', 'rgba(255,255,255,0.1)'],
                    borderWidth: 0
                }]
            },
            options: {
                cutout: '70%',
                plugins: { legend: { display: false } }
            }
        });
    }

    // Courses Chart
    const coursesCtx = document.getElementById('coursesChart')?.getContext('2d');
    if (coursesCtx) {
        coursesChart = new Chart(coursesCtx, {
            type: 'doughnut',
            data: {
                labels: ['Total Courses'],
                datasets: [{
                    data: [courses.length, 1],
                    backgroundColor: ['#0072ff', 'rgba(255,255,255,0.1)'],
                    borderWidth: 0
                }]
            },
            options: {
                cutout: '70%',
                plugins: { legend: { display: false } }
            }
        });
    }

    // Performance Chart
    const perfCtx = document.getElementById('performanceChart')?.getContext('2d');
    if (perfCtx && students.length > 0) {
        performanceChart = new Chart(perfCtx, {
            type: 'bar',
            data: {
                labels: students.slice(0, 10).map(s => s.roll),
                datasets: [{
                    label: 'CGPA',
                    data: students.slice(0, 10).map(s => s.cgpa || 0),
                    backgroundColor: '#00c6ff',
                    borderColor: '#0072ff',
                    borderWidth: 1
                }]
            },
            options: {
                scales: { y: { beginAtZero: true, max: 4 } },
                plugins: { legend: { display: false } }
            }
        });
    }

    // Department Chart
    const deptCtx = document.getElementById('deptChart')?.getContext('2d');
    if (deptCtx) {
        const deptData = {};
        students.forEach(s => {
            deptData[s.department] = (deptData[s.department] || 0) + 1;
        });
        
        deptChart = new Chart(deptCtx, {
            type: 'pie',
            data: {
                labels: Object.keys(deptData).length > 0 ? Object.keys(deptData) : ['No Data'],
                datasets: [{
                    data: Object.keys(deptData).length > 0 ? Object.values(deptData) : [1],
                    backgroundColor: ['#00c6ff', '#0072ff', '#00e5ff', '#00b0ff', '#0091ea'],
                    borderWidth: 0
                }]
            }
        });
    }

    // Fee Chart
    const feeCtx = document.getElementById('feeChart')?.getContext('2d');
    if (feeCtx) {
        const paidCount = students.filter(s => s.feePaid).length;
        const unpaidCount = students.length - paidCount;
        
        feeChart = new Chart(feeCtx, {
            type: 'pie',
            data: {
                labels: ['Paid', 'Unpaid'],
                datasets: [{
                    data: [paidCount || 1, unpaidCount || 1],
                    backgroundColor: ['#00c853', '#ff3d00'],
                    borderWidth: 0
                }]
            }
        });
    }
}

function initStudentCharts() {
    const student = students.find(s => s.roll === currentUser);
    if (!student) return;
    
    // Semester GPA Chart
    const semCtx = document.getElementById('semesterGPAChart')?.getContext('2d');
    if (semCtx) {
        // This is a simplified version - you can add actual semester data tracking
        const semGPAs = [];
        for (let i = 1; i <= student.semester; i++) {
            semGPAs.push(student.cgpa * (i / student.semester)); // Sample data
        }

        new Chart(semCtx, {
            type: 'line',
            data: {
                labels: Array.from({length: student.semester}, (_, i) => `Sem ${i+1}`),
                datasets: [{
                    label: 'Semester GPA',
                    data: semGPAs,
                    borderColor: '#00c6ff',
                    backgroundColor: 'rgba(0,198,255,0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                scales: { y: { beginAtZero: true, max: 4 } },
                plugins: { tooltip: { enabled: true } }
            }
        });
    }
}

function updateCharts() {
    if (studentsChart) {
        studentsChart.data.datasets[0].data = [students.length, 1];
        studentsChart.update();
    }
    
    if (coursesChart) {
        coursesChart.data.datasets[0].data = [courses.length, 1];
        coursesChart.update();
    }
    
    if (performanceChart && students.length > 0) {
        performanceChart.data.labels = students.slice(0, 10).map(s => s.roll);
        performanceChart.data.datasets[0].data = students.slice(0, 10).map(s => s.cgpa || 0);
        performanceChart.update();
    }
    
    if (deptChart) {
        const deptData = {};
        students.forEach(s => {
            deptData[s.department] = (deptData[s.department] || 0) + 1;
        });
        deptChart.data.labels = Object.keys(deptData).length > 0 ? Object.keys(deptData) : ['No Data'];
        deptChart.data.datasets[0].data = Object.keys(deptData).length > 0 ? Object.values(deptData) : [1];
        deptChart.update();
    }
    
    if (feeChart) {
        const paidCount = students.filter(s => s.feePaid).length;
        const unpaidCount = students.length - paidCount;
        feeChart.data.datasets[0].data = [paidCount || 1, unpaidCount || 1];
        feeChart.update();
    }
}

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
    // Initialize data
    renderStudents();
    renderCourses();
    updateCourseStats();
    renderDefaulters();
    updateQuickAllocate();
    
    // Add sample data if empty
    if (students.length === 0) {
        addSampleData();
    }
});

function addSampleData() {
    // Add sample courses
    if (courses.length === 0) {
        courses.push(
            { code: 'CS101', name: 'Computer Programming', credits: 4, teacher: 'Dr. Smith' },
            { code: 'CS201', name: 'Data Structures', credits: 4, teacher: 'Dr. Johnson' },
            { code: 'MA101', name: 'Mathematics I', credits: 3, teacher: 'Prof. Williams' },
            { code: 'PH101', name: 'Physics I', credits: 3, teacher: 'Dr. Brown' }
        );
    }
    
    // Add sample students
    if (students.length === 0) {
        students.push(
            { roll: 'CS001', name: 'John Doe', department: 'Computer Science', semester: 3, courses: ['CS101', 'CS201'], grades: [{courseCode: 'CS101', gradePoint: 3.7}, {courseCode: 'CS201', gradePoint: 3.3}], cgpa: 0, feePaid: true, fineAmount: 0 },
            { roll: 'CS002', name: 'Jane Smith', department: 'Computer Science', semester: 5, courses: ['CS201', 'MA101'], grades: [{courseCode: 'CS201', gradePoint: 4.0}, {courseCode: 'MA101', gradePoint: 3.3}], cgpa: 0, feePaid: false, fineAmount: 500 },
            { roll: 'EC001', name: 'Bob Wilson', department: 'Electronics', semester: 3, courses: ['PH101', 'MA101'], grades: [{courseCode: 'PH101', gradePoint: 3.0}, {courseCode: 'MA101', gradePoint: 2.7}], cgpa: 0, feePaid: true, fineAmount: 0 }
        );
        
        // Calculate CGPA for sample students
        students.forEach(s => {
            s.cgpa = calculateCGPA(s);
        });
    }
    
    saveData();
    renderStudents();
    renderCourses();
    updateCourseStats();
    renderDefaulters();
    updateQuickAllocate();
}