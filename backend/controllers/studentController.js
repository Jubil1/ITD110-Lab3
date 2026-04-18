const { getSession } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const formatStudent = (record) => {
  const node = record.get('s').properties;
  const courses = record.get('courses') || [];
  return {
    _id: node.id,
    studentId: node.studentId,
    name: node.name,
    email: node.email,
    courses: courses
      .filter((c) => c != null)
      .map((c) => ({
        _id: c.properties.id,
        courseCode: c.properties.courseCode,
        courseName: c.properties.courseName,
      })),
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
  };
};

function validateStudentPayload({ studentId, name, email }) {
  if (!studentId || !name || !email) {
    return 'studentId, name, and email are required';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Invalid email format';
  }
  return null;
}

const getStudents = async (req, res) => {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (s:Student)
      OPTIONAL MATCH (s)-[:ENROLLED_IN]->(c:Course)
      WITH s, collect(DISTINCT c) AS courses
      RETURN s, courses
      ORDER BY s.createdAt DESC
    `);
    res.json(result.records.map(formatStudent));
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    await session.close();
  }
};

const getStudent = async (req, res) => {
  const session = getSession();
  try {
    const result = await session.run(
      `
      MATCH (s:Student {id: $id})
      OPTIONAL MATCH (s)-[:ENROLLED_IN]->(c:Course)
      WITH s, collect(DISTINCT c) AS courses
      RETURN s, courses
    `,
      { id: req.params.id }
    );

    if (result.records.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json(formatStudent(result.records[0]));
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    await session.close();
  }
};

const createStudent = async (req, res) => {
  const session = getSession();
  try {
    const { studentId, name, email, courses = [] } = req.body;
    const validationError = validateStudentPayload({ studentId, name, email });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const duplicate = await session.run(
      `MATCH (s:Student {studentId: $studentId}) RETURN s LIMIT 1`,
      { studentId: studentId.trim() }
    );
    if (duplicate.records.length > 0) {
      return res.status(409).json({ message: 'Student ID already exists' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await session.run(
      `
      CREATE (s:Student {
        id: $id,
        studentId: $studentId,
        name: $name,
        email: $email,
        createdAt: $now,
        updatedAt: $now
      })
    `,
      {
        id,
        studentId: studentId.trim(),
        name: name.trim(),
        email: email.trim(),
        now,
      }
    );

    if (Array.isArray(courses) && courses.length > 0) {
      await session.run(
        `
        MATCH (s:Student {id: $studentId})
        UNWIND $courseIds AS courseId
        MATCH (c:Course {id: courseId})
        MERGE (s)-[:ENROLLED_IN]->(c)
      `,
        { studentId: id, courseIds: courses }
      );
    }

    const result = await session.run(
      `
      MATCH (s:Student {id: $id})
      OPTIONAL MATCH (s)-[:ENROLLED_IN]->(c:Course)
      WITH s, collect(DISTINCT c) AS courses
      RETURN s, courses
    `,
      { id }
    );

    res.status(201).json(formatStudent(result.records[0]));
  } catch (error) {
    res.status(400).json({ message: error.message });
  } finally {
    await session.close();
  }
};

const updateStudent = async (req, res) => {
  const session = getSession();
  try {
    const { studentId, name, email, courses = [] } = req.body;
    const validationError = validateStudentPayload({ studentId, name, email });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const duplicate = await session.run(
      `
      MATCH (s:Student {studentId: $studentId})
      WHERE s.id <> $id
      RETURN s LIMIT 1
    `,
      { studentId: studentId.trim(), id: req.params.id }
    );
    if (duplicate.records.length > 0) {
      return res.status(409).json({ message: 'Student ID already exists' });
    }

    const now = new Date().toISOString();

    const updateResult = await session.run(
      `
      MATCH (s:Student {id: $id})
      SET s.studentId = $studentId,
          s.name = $name,
          s.email = $email,
          s.updatedAt = $now
      RETURN s
    `,
      {
        id: req.params.id,
        studentId: studentId.trim(),
        name: name.trim(),
        email: email.trim(),
        now,
      }
    );

    if (updateResult.records.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    await session.run(`MATCH (s:Student {id: $id})-[r:ENROLLED_IN]->() DELETE r`, {
      id: req.params.id,
    });

    if (Array.isArray(courses) && courses.length > 0) {
      await session.run(
        `
        MATCH (s:Student {id: $studentId})
        UNWIND $courseIds AS courseId
        MATCH (c:Course {id: courseId})
        MERGE (s)-[:ENROLLED_IN]->(c)
      `,
        { studentId: req.params.id, courseIds: courses }
      );
    }

    const result = await session.run(
      `
      MATCH (s:Student {id: $id})
      OPTIONAL MATCH (s)-[:ENROLLED_IN]->(c:Course)
      WITH s, collect(DISTINCT c) AS courses
      RETURN s, courses
    `,
      { id: req.params.id }
    );

    res.json(formatStudent(result.records[0]));
  } catch (error) {
    res.status(400).json({ message: error.message });
  } finally {
    await session.close();
  }
};

const deleteStudent = async (req, res) => {
  const session = getSession();
  try {
    const exists = await session.run(`MATCH (s:Student {id: $id}) RETURN s LIMIT 1`, {
      id: req.params.id,
    });
    if (exists.records.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    await session.run(`MATCH (s:Student {id: $id}) DETACH DELETE s`, {
      id: req.params.id,
    });

    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    await session.close();
  }
};

module.exports = {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
};
