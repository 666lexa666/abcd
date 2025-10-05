import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // В ENV

const supabase = createClient(supabaseUrl, supabaseServiceKey);

app.post('/link-steam', async (req, res) => {
  try {
    const { steamLogin, token } = req.body;

    if (!steamLogin || steamLogin.length < 3) {
      return res.status(400).json({ error: 'Steam логин должен содержать минимум 3 символа' });
    }

    if (!token) {
      return res.status(401).json({ error: 'Необходима авторизация' });
    }

    // Проверяем токен пользователя через Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Неверный токен авторизации' });
    }

    // Проверяем, что логин ещё не привязан
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('steam_login')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return res.status(500).json({ error: 'Ошибка при получении профиля' });
    }

    if (profile.steam_login) {
      return res.status(400).json({ error: 'Steam логин уже привязан' });
    }

    // Проверяем внешний API Steam
    const steamApiUrl = 'https://desslyhub.com/api/v1/service/steamtopup/check_login';
    const steamRes = await fetch(steamApiUrl, {
      method: 'POST',
      headers: {
        apikey: '40a2cbac635f46a280a9e9fd7a5c5b20',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: steamLogin, amount: 1 })
    });

    const steamJson = await steamRes.json();
    if (!steamJson.can_refill) {
      return res.status(400).json({ error: 'Этот Steam логин нельзя привязать', details: steamJson });
    }

    // Обновляем профиль пользователя
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ steam_login: steamLogin })
      .eq('id', user.id);

    if (updateError) {
      return res.status(500).json({ error: 'Ошибка при обновлении профиля' });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
