const { getSession } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const formatFaculty = (record) => {
  const node = record.get('f').properties;
  const courses = record.get('courses') || [];
  return {
    _id: node.id,
    name: node.name,
    address: node.address,
    department: node.department,
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

const MATCH_FACULTY_FULL = `
  MATCH (f:Faculty)
  OPTIONAL MATCH (f)-[:TEACHES]->(c:Course)
  WITH f, collect(DISTINCT c) AS courses
  RETURN f, courses
  ORDER BY f.createdAt DESC`;

const MATCH_FACULTY_BY_ID = `
  MATCH (f:Faculty {id: $id})
  OPTIONAL MATCH (f)-[:TEACHES]->(c:Course)
  WITH f, collect(DISTINCT c) AS courses
  RETURN f, courses`;

function validateFacultyPayload({ name, address, department }) {
  if (!name || !address || !department) {
    return 'name, address, and department are required';
  }
  return null;
}

const getFaculties = async (req, res) => {
  const session = getSession();
  try {
    const result = await session.run(MATCH_FACULTY_FULL);
    res.json(result.records.map(formatFaculty));
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    await session.close();
  }
};

const getFaculty = async (req, res) => {
  const session = getSession();
  try {
    const result = await session.run(MATCH_FACULTY_BY_ID, { id: req.params.id });
    if (result.records.length === 0) {
      return res.status(404).json({ message: 'Faculty not found' });
    }
    res.json(formatFaculty(result.records[0]));
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    await session.close();
  }
};

const createFaculty = async (req, res) => {
  const session = getSession();
  try {
    const { name, address, department, courses = [] } = req.body;
    const validationError = validateFacultyPayload({ name, address, department });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await session.run(
      `
      CREATE (f:Faculty {
        id: $id,
        name: $name,
        address: $address,
        department: $department,
        createdAt: $now,
        updatedAt: $now
      })
    `,
      {
        id,
        name: name.trim(),
        address: address.trim(),
        department: department.trim(),
        now,
      }
    );

    if (Array.isArray(courses) && courses.length > 0) {
      await session.run(
        `
        MATCH (f:Faculty {id: $facultyId})
        UNWIND $courseIds AS courseId
        MATCH (c:Course {id: courseId})
        MERGE (f)-[:TEACHES]->(c)
      `,
        { facultyId: id, courseIds: courses }
      );
    }

    const result = await session.run(MATCH_FACULTY_BY_ID, { id });
    res.status(201).json(formatFaculty(result.records[0]));
  } catch (error) {
    res.status(400).json({ message: error.message });
  } finally {
    await session.close();
  }
};

const updateFaculty = async (req, res) => {
  const session = getSession();
  try {
    const { name, address, department, courses = [] } = req.body;
    const validationError = validateFacultyPayload({ name, address, department });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const now = new Date().toISOString();

    const updateResult = await session.run(
      `
      MATCH (f:Faculty {id: $id})
      SET f.name = $name,
          f.address = $address,
          f.department = $department,
          f.updatedAt = $now
      RETURN f
    `,
      {
        id: req.params.id,
        name: name.trim(),
        address: address.trim(),
        department: department.trim(),
        now,
      }
    );

    if (updateResult.records.length === 0) {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    await session.run(`MATCH (f:Faculty {id: $id})-[r:TEACHES]->() DELETE r`, {
      id: req.params.id,
    });

    if (Array.isArray(courses) && courses.length > 0) {
      await session.run(
        `
        MATCH (f:Faculty {id: $facultyId})
        UNWIND $courseIds AS courseId
        MATCH (c:Course {id: courseId})
        MERGE (f)-[:TEACHES]->(c)
      `,
        { facultyId: req.params.id, courseIds: courses }
      );
    }

    const result = await session.run(MATCH_FACULTY_BY_ID, { id: req.params.id });
    res.json(formatFaculty(result.records[0]));
  } catch (error) {
    res.status(400).json({ message: error.message });
  } finally {
    await session.close();
  }
};

const deleteFaculty = async (req, res) => {
  const session = getSession();
  try {
    const exists = await session.run(`MATCH (f:Faculty {id: $id}) RETURN f LIMIT 1`, {
      id: req.params.id,
    });
    if (exists.records.length === 0) {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    await session.run(`MATCH (f:Faculty {id: $id}) DETACH DELETE f`, {
      id: req.params.id,
    });

    res.json({ message: 'Faculty deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    await session.close();
  }
};

module.exports = {
  getFaculties,
  getFaculty,
  createFaculty,
  updateFaculty,
  deleteFaculty,
};
