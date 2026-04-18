const API_URL = 'http://localhost:5001/api/courses';

const form = document.getElementById('course-form');
const formTitle = document.getElementById('form-title');
const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');
const courseIdInput = document.getElementById('course-id');
const courseCodeInput = document.getElementById('course-code');
const courseNameInput = document.getElementById('course-name');
const descriptionInput = document.getElementById('description');
const creditsInput = document.getElementById('credits');
const tbody = document.getElementById('course-tbody');
const noCoursesMsg = document.getElementById('no-courses');
const courseTableWrap = document.getElementById('course-table-wrap');
const statusEl = document.getElementById('status');

let isEditing = false;

document.addEventListener('DOMContentLoaded', async () => {
  await fetchCourses();
  const pending = sessionStorage.getItem('pendingCourseEdit');
  if (pending) {
    sessionStorage.removeItem('pendingCourseEdit');
    await editCourse(pending);
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

async function fetchCourses(clearBanner = true) {
  try {
    const courses = await request(API_URL);
    renderCourses(courses);
    if (clearBanner) setStatus('');
  } catch (error) {
    setStatus(`Error fetching courses: ${error.message}`, 'error');
  }
}

function renderCourses(courses) {
  tbody.innerHTML = '';

  if (!courses.length) {
    noCoursesMsg.classList.remove('hidden');
    if (courseTableWrap) courseTableWrap.classList.add('hidden');
    return;
  }

  noCoursesMsg.classList.add('hidden');
  if (courseTableWrap) courseTableWrap.classList.remove('hidden');

  courses.forEach((course) => {
    const row = document.createElement('tr');
    const studentNames = course.students?.length
      ? course.students.map((s) => escapeHtml(`${s.studentId || 'N/A'} - ${s.name}`)).join(', ')
      : '-';
    const facultyNames = course.faculty?.length
      ? course.faculty.map((f) => escapeHtml(f.name)).join(', ')
      : '-';

    row.innerHTML = `
      <td>${escapeHtml(course.courseCode)}</td>
      <td>${escapeHtml(course.courseName)}</td>
      <td>${escapeHtml(course.description || '-')}</td>
      <td>${course.credits ?? '-'}</td>
      <td>${studentNames}</td>
      <td>${facultyNames}</td>
      <td>
        <button class="btn-edit" onclick="editCourse('${course._id}')">Edit</button>
        <button class="btn-delete" onclick="deleteCourse('${course._id}')">Delete</button>
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

  const credits = creditsInput.value ? Number(creditsInput.value) : null;
  const courseData = {
    courseCode: courseCodeInput.value.trim(),
    courseName: courseNameInput.value.trim(),
    description: descriptionInput.value.trim(),
    credits,
  };

  submitBtn.disabled = true;
  try {
    const wasEditing = isEditing;
    if (wasEditing) {
      await request(`${API_URL}/${courseIdInput.value}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(courseData),
      });
    } else {
      await request(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(courseData),
      });
    }

    resetForm();
    await fetchCourses(false);
    setSaveSuccessStatus(
      wasEditing ? 'Course updated successfully.' : 'Course created successfully.'
    );
  } catch (error) {
    setStatus(`Error saving course: ${error.message}`, 'error');
  } finally {
    submitBtn.disabled = false;
  }
}

async function editCourse(id) {
  try {
    const course = await request(`${API_URL}/${id}`);

    courseIdInput.value = course._id;
    courseCodeInput.value = course.courseCode;
    courseNameInput.value = course.courseName;
    descriptionInput.value = course.description || '';
    creditsInput.value = course.credits ?? '';

    isEditing = true;
    formTitle.textContent = 'Edit Course';
    submitBtn.textContent = 'Update Course';
    cancelBtn.classList.remove('hidden');

    courseCodeInput.focus();
  } catch (error) {
    setStatus(`Error loading course: ${error.message}`, 'error');
  }
}

async function deleteCourse(id) {
  if (!confirm('Are you sure you want to delete this course?')) return;

  try {
    await request(`${API_URL}/${id}`, { method: 'DELETE' });
    setStatus('Course deleted successfully.', 'success');
    await fetchCourses(false);
  } catch (error) {
    setStatus(`Error deleting course: ${error.message}`, 'error');
  }
}

function resetForm() {
  form.reset();
  courseIdInput.value = '';
  isEditing = false;
  formTitle.textContent = 'Add New Course';
  submitBtn.textContent = 'Add Course';
  cancelBtn.classList.add('hidden');
}
