// index.js
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import bodyParser from 'body-parser';

// Настройки Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://xyzcompany.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
app.use(bodyParser.json());

app.post('/api/order', async (req, res) => {
  try {
    console.log('📥 Incoming request body:', req.body);

    const { steamId, amount, api_login, api_key } = req.body;

    if (!steamId || !amount || !api_login || !api_key) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Делим сумму на 100
    const amountCents = Number(amount) / 100;

    // Генерация уникальных идентификаторов
    const operationId = uuidv4();
    const qrcId = uuidv4();
    const payload = `https://fake-qr.com/${qrcId}`;

    // Запись в базу данных
    const { data, error } = await supabase.from('purchases_test').insert([
      {
        id: operationId,
        amount: amountCents,
        api_login,
        qr_payload: payload,
        qr_id: qrcId,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        commit: null,
      },
    ]);

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    const responsePayload = {
      result: {
        operation_id: operationId,
        qr_id: qrcId,
        qr_payload: payload,
      },
    };

    console.log('📤 Response payload:', responsePayload);

    return res.status(201).json(responsePayload);
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
