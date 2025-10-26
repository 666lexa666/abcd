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
    const { steamId, amount, api_login, api_key } = req.body;

    if (!steamId || !amount || !api_login || !api_key) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Генерация уникальных идентификаторов
    const operation_id = uuidv4();
    const qr_id = uuidv4();
    const qr_payload = `https://fake-qr.com/${qr_id}`;

    // Запись в базу данных
    const { data, error } = await supabase
      .from('purchases_test')
      .insert([
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

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    // Отправка ответа
    return res.json({
      operation_id,
      qr_payload,
      qr_id,
    });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
