import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(cors());
app.use(express.json());

// Supabase client с Service Role Key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Проверка Steam через Desslyhub API
async function checkSteamLogin(steamLogin) {
  const url = 'https://desslyhub.com/api/v1/service/steamtopup/check_login';
  const options = {
    method: 'POST',
    headers: {
      apikey: '40a2cbac635f46a280a9e9fd7a5c5b20',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ username: steamLogin, amount: 1 }),
  };

  const res = await fetch(url, options);
  return res.json();
}

// Маршрут для привязки Steam логина
app.post('/link-steam', async (req, res) => {
  try {
    const { steamLogin, userId } = req.body;

    if (!steamLogin || steamLogin.length < 3) {
      return res.status(400).json({ error: 'Steam логин должен содержать минимум 3 символа' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'Не указан userId' });
    }

    // Проверка через Desslyhub
    const checkResult = await checkSteamLogin(steamLogin);

    if (!checkResult.can_refill) {
      return res.status(400).json({ error: 'Этот Steam логин нельзя использовать', details: checkResult });
    }

    // Проверка, что логин ещё не используется
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('steam_login', steamLogin)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: 'Этот Steam логин уже используется другим пользователем' });
    }

    // Обновляем профиль пользователя
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

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
