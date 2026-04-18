const STUDENTS_URL = 'http://localhost:5001/api/students';
const FACULTY_URL = 'http://localhost:5001/api/faculty';
const COURSES_URL = 'http://localhost:5001/api/courses';

const statusEl = document.getElementById('status');
const hub = document.getElementById('lists-hub');

const state = {
  facultyLoaded: false,
  coursesLoaded: false,
};

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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text == null ? '' : String(text);
  return div.innerHTML;
}

function renderStudents(students) {
  const tbody = document.getElementById('lists-students-tbody');
  const noMsg = document.getElementById('lists-no-students');
  const wrap = document.getElementById('lists-students-table-wrap');
  tbody.innerHTML = '';

  if (!students.length) {
    noMsg.classList.remove('hidden');
    if (wrap) wrap.classList.add('hidden');
    return;
  }
  noMsg.classList.add('hidden');
  if (wrap) wrap.classList.remove('hidden');

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
        <div class="table-row-actions">
          <button type="button" class="btn-edit" data-action="edit-student" data-id="${student._id}">Edit</button>
          <button type="button" class="btn-delete" data-action="delete-student" data-id="${student._id}">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function renderFaculty(list) {
  const tbody = document.getElementById('lists-faculty-tbody');
  const noMsg = document.getElementById('lists-no-faculty');
  const wrap = document.getElementById('lists-faculty-table-wrap');
  tbody.innerHTML = '';

  if (!list.length) {
    noMsg.classList.remove('hidden');
    if (wrap) wrap.classList.add('hidden');
    return;
  }
  noMsg.classList.add('hidden');
  if (wrap) wrap.classList.remove('hidden');

  list.forEach((faculty) => {
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
        <div class="table-row-actions">
          <button type="button" class="btn-edit" data-action="edit-faculty" data-id="${faculty._id}">Edit</button>
          <button type="button" class="btn-delete" data-action="delete-faculty" data-id="${faculty._id}">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function renderCourses(courses) {
  const tbody = document.getElementById('lists-course-tbody');
  const noMsg = document.getElementById('lists-no-courses');
  const wrap = document.getElementById('lists-course-table-wrap');
  tbody.innerHTML = '';

  if (!courses.length) {
    noMsg.classList.remove('hidden');
    if (wrap) wrap.classList.add('hidden');
    return;
  }
  noMsg.classList.add('hidden');
  if (wrap) wrap.classList.remove('hidden');

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
        <div class="table-row-actions">
          <button type="button" class="btn-edit" data-action="edit-course" data-id="${course._id}">Edit</button>
          <button type="button" class="btn-delete" data-action="delete-course" data-id="${course._id}">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}

async function loadStudents() {
  try {
    const students = await request(STUDENTS_URL);
    renderStudents(students);
    setStatus('');
  } catch (e) {
    setStatus(`Error loading students: ${e.message}`, 'error');
  }
}

async function loadFaculty() {
  try {
    const list = await request(FACULTY_URL);
    renderFaculty(list);
    setStatus('');
  } catch (e) {
    setStatus(`Error loading faculty: ${e.message}`, 'error');
  }
}

async function loadCourses() {
  try {
    const courses = await request(COURSES_URL);
    renderCourses(courses);
    setStatus('');
  } catch (e) {
    setStatus(`Error loading courses: ${e.message}`, 'error');
  }
}

function initTabs() {
  const tablist = hub.querySelector('[role="tablist"]');
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const i = tabs.indexOf(tab);
      tabs.forEach((t, j) => {
        const selected = j === i;
        t.setAttribute('aria-selected', selected ? 'true' : 'false');
        const panelId = t.getAttribute('aria-controls');
        const panel = document.getElementById(panelId);
        if (panel) panel.hidden = !selected;
      });

      if (tab.id === 'tab-lists-faculty' && !state.facultyLoaded) {
        state.facultyLoaded = true;
        loadFaculty();
      }
      if (tab.id === 'tab-lists-courses' && !state.coursesLoaded) {
        state.coursesLoaded = true;
        loadCourses();
      }
    });
  });
}

hub.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;
  if (!id) return;

  if (action === 'edit-student') {
    sessionStorage.setItem('pendingStudentEdit', id);
    window.location.href = 'index.html';
    return;
  }
  if (action === 'edit-faculty') {
    sessionStorage.setItem('pendingFacultyEdit', id);
    window.location.href = 'faculty.html';
    return;
  }
  if (action === 'edit-course') {
    sessionStorage.setItem('pendingCourseEdit', id);
    window.location.href = 'course.html';
    return;
  }

  if (action === 'delete-student') {
    if (!confirm('Delete this student?')) return;
    try {
      await request(`${STUDENTS_URL}/${id}`, { method: 'DELETE' });
      setStatus('Student deleted.', 'success');
      await loadStudents();
    } catch (err) {
      setStatus(err.message, 'error');
    }
    return;
  }
  if (action === 'delete-faculty') {
    if (!confirm('Delete this faculty member?')) return;
    try {
      await request(`${FACULTY_URL}/${id}`, { method: 'DELETE' });
      setStatus('Faculty deleted.', 'success');
      await loadFaculty();
    } catch (err) {
      setStatus(err.message, 'error');
    }
    return;
  }
  if (action === 'delete-course') {
    if (!confirm('Delete this course?')) return;
    try {
      await request(`${COURSES_URL}/${id}`, { method: 'DELETE' });
      setStatus('Course deleted.', 'success');
      await loadCourses();
    } catch (err) {
      setStatus(err.message, 'error');
    }
  }
});

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  loadStudents();
});
