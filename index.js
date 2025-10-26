// index.js
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import bodyParser from 'body-parser';
import cors from 'cors';

// Настройки Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://xyzcompany.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post('/api/order', async (req, res) => {
  try {
    const { steamId, amount, api_login, api_key } = req.body;

    if (!steamId || !amount || !api_login || !api_key) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Проверка соответствия api_login и api_key в api_clients
    const { data: clientData, error: clientError } = await supabase
      .from('api_clients')
      .select('*')
      .eq('api_login', api_login)
      .eq('api_key', api_key)
      .single();

    if (clientError || !clientData) {
      return res.status(403).json({ error: 'Invalid API credentials' });
    }

    // Генерация уникальных идентификаторов
    const operation_id = uuidv4();
    const qr_id = uuidv4();
    const qr_payload = `https://fake-qr.com/${qr_id}`;

    // Вставка в purchases_test
    const { error: insertError } = await supabase.from('purchases_test').insert([
      {
        id: operation_id,
        amount,
        api_login,
        qr_payload,
        qr_id,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        commit: null,
      },
    ]);

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      return res.status(500).json({ error: 'Database error' });
    }

    // Ответ
    return res.json({ operation_id, qr_payload, qr_id });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
