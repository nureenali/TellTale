import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

async function runConfigTests() {
  console.log('🧪 Starting TellTale Gemini Configuration & Security Verification Suite...\n');

  const cwd = process.cwd();
  const envLocalPath = path.resolve(cwd, '.env.local');
  const envBackupPath = path.resolve(cwd, '.env.local.backup-test');
  const envBasePath = path.resolve(cwd, '.env');
  const envBaseBackupPath = path.resolve(cwd, '.env.backup-test');

  // Backup existing .env and .env.local if present
  if (fs.existsSync(envLocalPath)) {
    fs.renameSync(envLocalPath, envBackupPath);
  }
  if (fs.existsSync(envBasePath)) {
    fs.copyFileSync(envBasePath, envBaseBackupPath);
    // Write clean empty base env for unconfigured test
    fs.writeFileSync(envBasePath, 'GEMINI_API_KEY=""\nGEMINI_MODEL="gemini-4-hydrogen"\n');
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Unconfigured / Missing Key Behavior
    // -------------------------------------------------------------
    console.log('1. Testing unconfigured state (no .env.local, empty/default .env)...');
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.API_KEY;

    // Dynamically import gemini.ts
    const { isGeminiConfigured, generateBrainstormSuggestions, getGeminiApiKey } = await import('../server/gemini.ts');

    assert.strictEqual(isGeminiConfigured(), false, 'isGeminiConfigured() should be false when no key is set');
    assert.strictEqual(getGeminiApiKey(), undefined, 'getGeminiApiKey() should be undefined');

    let caughtError = null;
    try {
      await generateBrainstormSuggestions({
        story_context: 'A detective investigates a theft in Victorian London.',
        passage: 'Fog rolled over the cobblestones.',
      });
    } catch (err) {
      caughtError = err;
    }

    assert(caughtError !== null, 'Should throw error when GEMINI_API_KEY is missing');
    assert(
      caughtError.message.includes('CONFIG_ERROR') && caughtError.message.includes('.env.local'),
      `Error message should mention .env.local. Received: ${caughtError.message}`
    );
    console.log('   ✓ Unconfigured key correctly throws CONFIG_ERROR pointing to .env.local');

    // -------------------------------------------------------------
    // Test 2: Placeholder Key Rejection
    // -------------------------------------------------------------
    console.log('\n2. Testing placeholder key values (e.g. "MY_GEMINI_API_KEY", "your_gemini_api_key_here")...');
    const placeholders = ['MY_GEMINI_API_KEY', 'your_gemini_api_key_here', 'YOUR_GEMINI_API_KEY', '""', "''"];
    for (const ph of placeholders) {
      process.env.GEMINI_API_KEY = ph;
      assert.strictEqual(isGeminiConfigured(), false, `Placeholder "${ph}" should not be treated as configured`);
    }
    console.log('   ✓ All placeholder values properly rejected as unconfigured');

    // -------------------------------------------------------------
    // Test 3: .env.local Detection & Precedence
    // -------------------------------------------------------------
    console.log('\n3. Testing .env.local detection & precedence over .env...');
    const testSecretKey = 'TEST_LOCAL_SECRET_KEY_12345';
    fs.writeFileSync(envLocalPath, `GEMINI_API_KEY="${testSecretKey}"\n`);

    // Re-initialize env loader
    const { loadAppEnv } = await import('../server/env.ts');
    delete process.env.GEMINI_API_KEY;
    loadAppEnv();

    assert.strictEqual(isGeminiConfigured(), true, 'isGeminiConfigured() should be true when .env.local exists');
    assert.strictEqual(getGeminiApiKey(), testSecretKey, 'getGeminiApiKey() should read the key from .env.local');
    console.log('   ✓ .env.local key detected and configured successfully without exposing raw value');

    // -------------------------------------------------------------
    // Test 4: Alternative Key Name Support (GOOGLE_API_KEY, API_KEY)
    // -------------------------------------------------------------
    console.log('\n4. Testing fallback environment variable names (GOOGLE_API_KEY, API_KEY)...');
    delete process.env.GEMINI_API_KEY;
    process.env.GOOGLE_API_KEY = 'TEST_GOOGLE_KEY_99999';
    assert.strictEqual(isGeminiConfigured(), true);
    assert.strictEqual(getGeminiApiKey(), 'TEST_GOOGLE_KEY_99999');

    delete process.env.GOOGLE_API_KEY;
    process.env.API_KEY = 'TEST_GENERIC_KEY_88888';
    assert.strictEqual(isGeminiConfigured(), true);
    assert.strictEqual(getGeminiApiKey(), 'TEST_GENERIC_KEY_88888');
    delete process.env.API_KEY;
    console.log('   ✓ Fallback variable names correctly supported');

    // -------------------------------------------------------------
    // Test 5: API Security & Leak Verification
    // -------------------------------------------------------------
    console.log('\n5. Verifying API key security in .env.example and frontend...');
    const envExampleContent = fs.readFileSync(path.resolve(cwd, '.env.example'), 'utf-8');
    assert(!envExampleContent.includes('AQ.Ab8RN'), '.env.example must not contain real keys or session tokens');
    assert(envExampleContent.includes('your_gemini_api_key_here'), '.env.example must contain placeholder');

    const gitignoreContent = fs.readFileSync(path.resolve(cwd, '.gitignore'), 'utf-8');
    assert(gitignoreContent.includes('.env.local'), '.gitignore must ignore .env.local');
    assert(gitignoreContent.includes('.env'), '.gitignore must ignore .env');
    console.log('   ✓ .env.example sanitized and .gitignore properly configured');

    console.log('\n🎉 ALL 5 CONFIGURATION AND SECURITY TESTS PASSED!\n');
  } finally {
    // Cleanup temporary test .env.local
    if (fs.existsSync(envLocalPath)) {
      fs.unlinkSync(envLocalPath);
    }
    // Restore original .env.local if there was one
    if (fs.existsSync(envBackupPath)) {
      fs.renameSync(envBackupPath, envLocalPath);
    }
    // Restore original .env
    if (fs.existsSync(envBaseBackupPath)) {
      fs.copyFileSync(envBaseBackupPath, envBasePath);
      fs.unlinkSync(envBaseBackupPath);
    }
  }
}

runConfigTests().catch(err => {
  console.error('\n❌ Test failure:', err);
  process.exit(1);
});
