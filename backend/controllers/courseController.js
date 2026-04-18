const { getSession } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const formatCourse = (record) => {
  const node = record.get('c').properties;
  const students = record.get('students') || [];
  const faculty = record.get('faculty') || [];
  return {
    _id: node.id,
    courseCode: node.courseCode,
    courseName: node.courseName,
    description: node.description,
    credits:
      node.credits != null && typeof node.credits.toNumber === 'function'
        ? node.credits.toNumber()
        : node.credits,
    students: students
      .filter((s) => s != null)
      .map((s) => ({
        _id: s.properties.id,
        studentId: s.properties.studentId,
        name: s.properties.name,
        email: s.properties.email,
      })),
    faculty: faculty
      .filter((f) => f != null)
      .map((f) => ({
        _id: f.properties.id,
        name: f.properties.name,
        department: f.properties.department,
      })),
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
  };
};

const MATCH_COURSE_BY_ID = `
  MATCH (c:Course {id: $id})
  OPTIONAL MATCH (s:Student)-[:ENROLLED_IN]->(c)
  OPTIONAL MATCH (f:Faculty)-[:TEACHES]->(c)
  WITH c, collect(DISTINCT s) AS students, collect(DISTINCT f) AS faculty
  RETURN c, students, faculty`;

function validateCoursePayload({ courseCode, courseName, credits }) {
  if (!courseCode || !courseName) {
    return 'courseCode and courseName are required';
  }
  if (credits !== undefined && credits !== null && credits !== '') {
    const n = Number(credits);
    if (!Number.isInteger(n) || n < 1 || n > 10) {
      return 'credits must be an integer between 1 and 10';
    }
  }
  return null;
}

const getCourses = async (req, res) => {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (c:Course)
      OPTIONAL MATCH (s:Student)-[:ENROLLED_IN]->(c)
      OPTIONAL MATCH (f:Faculty)-[:TEACHES]->(c)
      WITH c, collect(DISTINCT s) AS students, collect(DISTINCT f) AS faculty
      RETURN c, students, faculty
      ORDER BY c.createdAt DESC
    `);
    res.json(result.records.map(formatCourse));
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    await session.close();
  }
};

const getCourse = async (req, res) => {
  const session = getSession();
  try {
    const result = await session.run(MATCH_COURSE_BY_ID, { id: req.params.id });
    if (result.records.length === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.json(formatCourse(result.records[0]));
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    await session.close();
  }
};

const createCourse = async (req, res) => {
  const session = getSession();
  try {
    const { courseCode, courseName, description, credits } = req.body;
    const validationError = validateCoursePayload({ courseCode, courseName, credits });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const duplicate = await session.run(
      `MATCH (c:Course {courseCode: $courseCode}) RETURN c LIMIT 1`,
      { courseCode: courseCode.trim() }
    );
    if (duplicate.records.length > 0) {
      return res.status(409).json({ message: 'Course code already exists' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await session.run(
      `
      CREATE (c:Course {
        id: $id,
        courseCode: $courseCode,
        courseName: $courseName,
        description: $description,
        credits: $credits,
        createdAt: $now,
        updatedAt: $now
      })
    `,
      {
        id,
        courseCode: courseCode.trim(),
        courseName: courseName.trim(),
        description: (description || '').trim(),
        credits: credits ? parseInt(credits, 10) : null,
        now,
      }
    );

    const result = await session.run(MATCH_COURSE_BY_ID, { id });
    res.status(201).json(formatCourse(result.records[0]));
  } catch (error) {
    res.status(400).json({ message: error.message });
  } finally {
    await session.close();
  }
};

const updateCourse = async (req, res) => {
  const session = getSession();
  try {
    const { courseCode, courseName, description, credits } = req.body;
    const validationError = validateCoursePayload({ courseCode, courseName, credits });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const duplicate = await session.run(
      `
      MATCH (c:Course {courseCode: $courseCode})
      WHERE c.id <> $id
      RETURN c LIMIT 1
    `,
      { courseCode: courseCode.trim(), id: req.params.id }
    );
    if (duplicate.records.length > 0) {
      return res.status(409).json({ message: 'Course code already exists' });
    }

    const now = new Date().toISOString();

    const updateResult = await session.run(
      `
      MATCH (c:Course {id: $id})
      SET c.courseCode = $courseCode,
          c.courseName = $courseName,
          c.description = $description,
          c.credits = $credits,
          c.updatedAt = $now
      RETURN c
    `,
      {
        id: req.params.id,
        courseCode: courseCode.trim(),
        courseName: courseName.trim(),
        description: (description || '').trim(),
        credits: credits ? parseInt(credits, 10) : null,
        now,
      }
    );

    if (updateResult.records.length === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const result = await session.run(MATCH_COURSE_BY_ID, { id: req.params.id });
    res.json(formatCourse(result.records[0]));
  } catch (error) {
    res.status(400).json({ message: error.message });
  } finally {
    await session.close();
  }
};

const deleteCourse = async (req, res) => {
  const session = getSession();
  try {
    const exists = await session.run(`MATCH (c:Course {id: $id}) RETURN c LIMIT 1`, {
      id: req.params.id,
    });
    if (exists.records.length === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }

    await session.run(`MATCH (c:Course {id: $id}) DETACH DELETE c`, {
      id: req.params.id,
    });

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    await session.close();
  }
};

module.exports = {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
};
