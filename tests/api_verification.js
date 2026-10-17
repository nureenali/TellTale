// Automated verification test script for TellTale API
import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000/api';

async function runTests() {
  console.log('🚀 Starting TellTale API verification suite...\n');

  // 1. Health check
  console.log('1. Checking /api/health...');
  const healthRes = await fetch(`${BASE_URL}/health`);
  assert.strictEqual(healthRes.status, 200, 'Health endpoint should return 200');
  const healthData = await healthRes.json();
  assert.strictEqual(healthData.status, 'ok');
  assert.strictEqual(healthData.database, 'connected');
  console.log('   ✓ Health check passed:', healthData);

  // 2. Projects Listing
  console.log('\n2. Checking /api/projects (Listing)...');
  const projectsRes = await fetch(`${BASE_URL}/projects`);
  assert.strictEqual(projectsRes.status, 200);
  const projects = await projectsRes.json();
  assert(Array.isArray(projects), 'Projects should be an array');
  assert(projects.length > 0, 'Should have at least 1 seeded project');
  console.log(`   ✓ Found ${projects.length} project(s). Seed project: "${projects[0].title}"`);

  // 3. Create Project
  console.log('\n3. Creating new test project via POST /api/projects...');
  const newProjRes = await fetch(`${BASE_URL}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Automated Test Novel',
      description: 'A novel created by test suite to verify persistence.',
      genre: 'Mystery',
      target_words: 40000,
    }),
  });
  assert.strictEqual(newProjRes.status, 201, 'Project creation should return 201');
  const testProject = await newProjRes.json();
  assert.strictEqual(testProject.title, 'Automated Test Novel');
  console.log(`   ✓ Test project created with ID ${testProject.id}`);

  // 4. Create & Autosave Document
  console.log('\n4. Creating document in test project...');
  const newDocRes = await fetch(`${BASE_URL}/projects/${testProject.id}/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Chapter 1: The First Clue',
      content: 'The rain drummed against the attic glass.',
    }),
  });
  assert.strictEqual(newDocRes.status, 201);
  const testDoc = await newDocRes.json();
  assert.strictEqual(testDoc.title, 'Chapter 1: The First Clue');
  console.log(`   ✓ Document created with ID ${testDoc.id}`);

  console.log('   Simulating debounced autosave via PATCH /api/documents/:id...');
  const updatedDocRes = await fetch(`${BASE_URL}/documents/${testDoc.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: 'The rain drummed against the attic glass, rhythmically counting the seconds until midnight.',
      version: testDoc.version,
    }),
  });
  assert.strictEqual(updatedDocRes.status, 200);
  const updatedDoc = await updatedDocRes.json();
  assert.strictEqual(updatedDoc.version, testDoc.version + 1);
  assert(updatedDoc.word_count > testDoc.word_count);
  console.log(`   ✓ Autosave verified. New version: ${updatedDoc.version}, word count: ${updatedDoc.word_count}`);

  // 5. Notes CRUD
  console.log('\n5. Creating Story Note via POST /api/notes...');
  const newNoteRes = await fetch(`${BASE_URL}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Attic Layout & Hiding Spots',
      content: 'Hidden compartment beneath third floorboard on the western beam.',
      project_id: testProject.id,
      category: 'Worldbuilding',
    }),
  });
  assert.strictEqual(newNoteRes.status, 201);
  const testNote = await newNoteRes.json();
  assert.strictEqual(testNote.title, 'Attic Layout & Hiding Spots');
  console.log(`   ✓ Story note created with ID ${testNote.id}`);

  // 6. Ideas CRUD
  console.log('\n6. Saving Plot Idea via POST /api/ideas...');
  const newIdeaRes = await fetch(`${BASE_URL}/ideas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'The Landlord was the Accomplice',
      content: 'The landlord kept duplicate keys to all third-floor studios.',
      project_id: testProject.id,
      source: 'gemini',
    }),
  });
  assert.strictEqual(newIdeaRes.status, 201);
  const testIdea = await newIdeaRes.json();
  assert.strictEqual(testIdea.title, 'The Landlord was the Accomplice');
  console.log(`   ✓ Plot idea saved with ID ${testIdea.id}`);

  // 7. Cleanup test project (verifying cascade delete)
  console.log('\n7. Deleting test project via DELETE /api/projects/:id (Cascade test)...');
  const deleteRes = await fetch(`${BASE_URL}/projects/${testProject.id}`, {
    method: 'DELETE',
  });
  assert.strictEqual(deleteRes.status, 204);
  
  // Verify document was cascade-deleted
  const checkDocRes = await fetch(`${BASE_URL}/documents/${testDoc.id}`);
  assert.strictEqual(checkDocRes.status, 404, 'Cascaded document should no longer exist');
  console.log('   ✓ Test project and all associated documents deleted successfully');

  // 8. Workspace Export
  console.log('\n8. Checking /api/export (Workspace JSON Backup)...');
  const exportRes = await fetch(`${BASE_URL}/export`);
  assert.strictEqual(exportRes.status, 200);
  const exportData = await exportRes.json();
  assert(exportData.projects && Array.isArray(exportData.projects));
  console.log(`   ✓ Workspace export valid. Contains ${exportData.projects.length} project(s) and ${exportData.documents.length} document(s).`);

  console.log('\n🎉 ALL 8 BACKEND AND PERSISTENCE TEST SUITES PASSED FLAWLESSLY!\n');
}

runTests().catch(err => {
  console.error('\n❌ Test suite failure:', err);
  process.exit(1);
});
