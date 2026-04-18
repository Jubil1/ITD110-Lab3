const API_URL = 'http://localhost:5001/api/students';
const COURSES_API_URL = 'http://localhost:5001/api/courses';

const form = document.getElementById('student-form');
const formTitle = document.getElementById('form-title');
const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');
const studentIdInput = document.getElementById('student-id');
const studentIdFieldInput = document.getElementById('student-id-field');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const coursesSelect = document.getElementById('courses');
const tbody = document.getElementById('students-tbody');
const noStudentsMsg = document.getElementById('no-students');
const studentsTableWrap = document.getElementById('students-table-wrap');
const coursesHint = document.getElementById('courses-hint');
const statusEl = document.getElementById('status');

let isEditing = false;
let allCourses = [];

document.addEventListener('DOMContentLoaded', async () => {
  await fetchCourses();
  await fetchStudents();
  const pending = sessionStorage.getItem('pendingStudentEdit');
  if (pending) {
    sessionStorage.removeItem('pendingStudentEdit');
    await editStudent(pending);
  }
});

form.addEventListener('submit', handleSubmit);
cancelBtn.addEventListener('click', resetForm);

function setStatus(message = '', type = '') {
  if (!message) {
    statusEl.className = 'status hidden';
    statusEl.textContent = '';
    return;
  }
  statusEl.className = `status ${type}`;
  statusEl.textContent = message;
}

function setSaveSuccessStatus(messageText) {
  statusEl.replaceChildren();
  statusEl.className = 'status success';
  statusEl.append(document.createTextNode(`${messageText} `));
  const a = document.createElement('a');
  a.href = 'lists.html';
  a.className = 'status__link';
  a.textContent = 'View all tables';
  statusEl.append(a, document.createTextNode('.'));
}

async function request(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

async function fetchCourses() {
  try {
    allCourses = await request(COURSES_API_URL);
    populateCourseSelect();
  } catch (error) {
    setStatus(`Error fetching courses: ${error.message}`, 'error');
  }
}

function populateCourseSelect(selectedIds = []) {
  coursesSelect.innerHTML = '';
  allCourses.forEach((course) => {
    const option = document.createElement('option');
    option.value = course._id;
    option.textContent = `${course.courseCode} - ${course.courseName}`;
    if (selectedIds.includes(course._id)) option.selected = true;
    coursesSelect.appendChild(option);
  });
  if (coursesHint) {
    coursesHint.textContent = allCourses.length
      ? 'Tip: Hold Ctrl (Windows) or ⌘ (Mac) while clicking to select multiple courses.'
      : 'No courses yet. Open the Courses page and add at least one course first.';
  }
}

function getSelectedCourses() {
  return Array.from(coursesSelect.options)
    .filter((option) => option.selected)
    .map((option) => option.value);
}

async function fetchStudents(clearBanner = true) {
  try {
    const students = await request(API_URL);
    renderStudents(students);
    if (clearBanner) setStatus('');
  } catch (error) {
    setStatus(`Error fetching students: ${error.message}`, 'error');
  }
}

function renderStudents(students) {
  tbody.innerHTML = '';

  if (!students.length) {
    noStudentsMsg.classList.remove('hidden');
    if (studentsTableWrap) studentsTableWrap.classList.add('hidden');
    return;
  }

  noStudentsMsg.classList.add('hidden');
  if (studentsTableWrap) studentsTableWrap.classList.remove('hidden');

  students.forEach((student) => {
    const row = document.createElement('tr');
    const courseNames = student.courses?.length
      ? student.courses.map((c) => escapeHtml(`${c.courseCode} - ${c.courseName}`)).join(', ')
      : '-';

    row.innerHTML = `
      <td>${escapeHtml(student.studentId || '-')}</td>
      <td>${escapeHtml(student.name)}</td>
      <td>${escapeHtml(student.email)}</td>
      <td>${courseNames}</td>
      <td>
        <button class="btn-edit" onclick="editStudent('${student._id}')">Edit</button>
        <button class="btn-delete" onclick="deleteStudent('${student._id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function handleSubmit(e) {
  e.preventDefault();

  const studentData = {
    studentId: studentIdFieldInput.value.trim(),
    name: nameInput.value.trim(),
    email: emailInput.value.trim(),
    courses: getSelectedCourses(),
  };

  submitBtn.disabled = true;
  try {
    const wasEditing = isEditing;
    if (wasEditing) {
      await request(`${API_URL}/${studentIdInput.value}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData),
      });
    } else {
      await request(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData),
      });
    }

    resetForm();
    await fetchStudents(false);
    setSaveSuccessStatus(
      wasEditing ? 'Student updated successfully.' : 'Student created successfully.'
    );
  } catch (error) {
    setStatus(`Error saving student: ${error.message}`, 'error');
  } finally {
    submitBtn.disabled = false;
  }
}

async function editStudent(id) {
  try {
    const student = await request(`${API_URL}/${id}`);

    studentIdInput.value = student._id;
    studentIdFieldInput.value = student.studentId || '';
    nameInput.value = student.name;
    emailInput.value = student.email;

    const courseIds = student.courses ? student.courses.map((c) => c._id) : [];
    populateCourseSelect(courseIds);

    isEditing = true;
    formTitle.textContent = 'Edit Student';
    submitBtn.textContent = 'Update Student';
    cancelBtn.classList.remove('hidden');

    studentIdFieldInput.focus();
  } catch (error) {
    setStatus(`Error loading student: ${error.message}`, 'error');
  }
}

async function deleteStudent(id) {
  if (!confirm('Are you sure you want to delete this student?')) return;

  try {
    await request(`${API_URL}/${id}`, { method: 'DELETE' });
    setStatus('Student deleted successfully.', 'success');
    await fetchStudents(false);
  } catch (error) {
    setStatus(`Error deleting student: ${error.message}`, 'error');
  }
}

function resetForm() {
  form.reset();
  studentIdInput.value = '';
  isEditing = false;
  formTitle.textContent = 'Add New Student';
  submitBtn.textContent = 'Add Student';
  cancelBtn.classList.add('hidden');
  populateCourseSelect([]);
}
