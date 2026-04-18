const API_URL = 'http://localhost:5001/api/faculty';
const COURSES_API_URL = 'http://localhost:5001/api/courses';

const form = document.getElementById('faculty-form');
const formTitle = document.getElementById('form-title');
const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');
const facultyIdInput = document.getElementById('faculty-id');
const nameInput = document.getElementById('name');
const addressInput = document.getElementById('address');
const departmentInput = document.getElementById('department');
const coursesSelect = document.getElementById('courses');
const tbody = document.getElementById('faculty-tbody');
const noFacultyMsg = document.getElementById('no-faculty');
const facultyTableWrap = document.getElementById('faculty-table-wrap');
const coursesHint = document.getElementById('courses-hint');
const statusEl = document.getElementById('status');

let isEditing = false;
let allCourses = [];

document.addEventListener('DOMContentLoaded', async () => {
  await fetchCoursesForSelect();
  await fetchFaculties();
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

async function request(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

async function fetchCoursesForSelect() {
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
      ? 'Tip: Hold Ctrl (Windows) or ⌘ (Mac) while clicking to assign multiple courses.'
      : 'No courses yet. Open the Courses page and add at least one course first.';
  }
}

function getSelectedCourses() {
  return Array.from(coursesSelect.options)
    .filter((option) => option.selected)
    .map((option) => option.value);
}

async function fetchFaculties() {
  try {
    const faculties = await request(API_URL);
    renderFaculties(faculties);
    setStatus('');
  } catch (error) {
    setStatus(`Error fetching faculty: ${error.message}`, 'error');
  }
}

function renderFaculties(faculties) {
  tbody.innerHTML = '';

  if (!faculties.length) {
    noFacultyMsg.classList.remove('hidden');
    if (facultyTableWrap) facultyTableWrap.classList.add('hidden');
    return;
  }

  noFacultyMsg.classList.add('hidden');
  if (facultyTableWrap) facultyTableWrap.classList.remove('hidden');

  faculties.forEach((faculty) => {
    const row = document.createElement('tr');
    const courseNames = faculty.courses?.length
      ? faculty.courses.map((c) => escapeHtml(`${c.courseCode} - ${c.courseName}`)).join(', ')
      : '-';

    row.innerHTML = `
      <td>${escapeHtml(faculty.name)}</td>
      <td>${escapeHtml(faculty.address)}</td>
      <td>${escapeHtml(faculty.department)}</td>
      <td>${courseNames}</td>
      <td>
        <button class="btn-edit" onclick="editFaculty('${faculty._id}')">Edit</button>
        <button class="btn-delete" onclick="deleteFaculty('${faculty._id}')">Delete</button>
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

  const facultyData = {
    name: nameInput.value.trim(),
    address: addressInput.value.trim(),
    department: departmentInput.value.trim(),
    courses: getSelectedCourses(),
  };

  submitBtn.disabled = true;
  try {
    if (isEditing) {
      await request(`${API_URL}/${facultyIdInput.value}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(facultyData),
      });
      setStatus('Faculty updated successfully.', 'success');
    } else {
      await request(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(facultyData),
      });
      setStatus('Faculty created successfully.', 'success');
    }

    resetForm();
    await fetchFaculties();
  } catch (error) {
    setStatus(`Error saving faculty: ${error.message}`, 'error');
  } finally {
    submitBtn.disabled = false;
  }
}

async function editFaculty(id) {
  try {
    const faculty = await request(`${API_URL}/${id}`);

    facultyIdInput.value = faculty._id;
    nameInput.value = faculty.name;
    addressInput.value = faculty.address;
    departmentInput.value = faculty.department;

    const courseIds = faculty.courses ? faculty.courses.map((c) => c._id) : [];
    populateCourseSelect(courseIds);

    isEditing = true;
    formTitle.textContent = 'Edit Faculty';
    submitBtn.textContent = 'Update Faculty';
    cancelBtn.classList.remove('hidden');

    nameInput.focus();
  } catch (error) {
    setStatus(`Error loading faculty: ${error.message}`, 'error');
  }
}

async function deleteFaculty(id) {
  if (!confirm('Are you sure you want to delete this faculty member?')) return;

  try {
    await request(`${API_URL}/${id}`, { method: 'DELETE' });
    setStatus('Faculty deleted successfully.', 'success');
    await fetchFaculties();
  } catch (error) {
    setStatus(`Error deleting faculty: ${error.message}`, 'error');
  }
}

function resetForm() {
  form.reset();
  facultyIdInput.value = '';
  isEditing = false;
  formTitle.textContent = 'Add New Faculty';
  submitBtn.textContent = 'Add Faculty';
  cancelBtn.classList.add('hidden');
  populateCourseSelect([]);
}
