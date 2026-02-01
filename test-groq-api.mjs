// Test direct de l'API Groq
const API_KEY = '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';
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

console.log('🧪 Test API Groq...\n');
console.log('API Key:', API_KEY.substring(0, 15) + '...');
console.log('URL:', API_URL);
console.log('\n📤 Envoi de la requête...\n');

try {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'user', content: 'Réponds juste "OK" pour confirmer que tu fonctionnes.' }
      ],
      temperature: 0.7,
      max_tokens: 50,
      stream: false
    }),
  });

  console.log('📥 Réponse reçue:');
  console.log('  Status:', response.status);
  console.log('  Status Text:', response.statusText);
  console.log('  OK:', response.ok);
  console.log('');

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ ERREUR:');
    console.error(errorText);
    process.exit(1);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  console.log('✅ SUCCÈS:');
  console.log('  Modèle utilisé:', data.model);
  console.log('  Tokens utilisés:', data.usage?.total_tokens || 'N/A');
  console.log('  Réponse:', content);
  console.log('\n✨ L\'API Groq fonctionne correctement!\n');

} catch (error) {
  console.error('❌ ERREUR FATALE:');
  console.error(error.message);
  if (error.cause) {
    console.error('Cause:', error.cause);
  }
  process.exit(1);
}
