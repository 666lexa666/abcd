import express from 'express';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

app.post('/link-steam', async (req, res) => {
  try {
    const { userId, steamLogin } = req.body;

    if (!userId || !steamLogin || steamLogin.length < 3) {
      return res.status(400).json({ error: 'Неверные данные' });
    }

    // Проверка Steam логина через сторонний API
    const steamCheck = await fetch('https://desslyhub.com/api/v1/service/steamtopup/check_login', {
      method: 'POST',
      headers: {
        apikey: '40a2cbac635f46a280a9e9fd7a5c5b20',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ username: steamLogin, amount: 1 })
    });

    const steamData = await steamCheck.json();

    if (!steamData.can_refill) {
      return res.status(400).json({ error: 'Этот Steam логин нельзя привязать', details: steamData });
    }

    // Проверка, не занят ли логин у другого пользователя
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('steam_login', steamLogin)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: 'Этот Steam логин уже используется другим пользователем' });
    }

    // Обновление профиля
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ steam_login: steamLogin })
      .eq('id', userId);

    if (updateError) {
      return res.status(500).json({ error: 'Ошибка при обновлении профиля' });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
