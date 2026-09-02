import express from 'express';
import { Telegraf } from 'telegraf';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 8080;

app.get('/api/healthz', (req, res) => {
  res.status(200).send('OK');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');

bot.start((ctx) => ctx.reply('Bot AI Siap! Gunakan /img [prompt] untuk generate gambar.'));

bot.command('img', async (ctx) => {
  const promptText = ctx.message.text.replace('/img', '').trim();
  if (!promptText) return ctx.reply('Masukkan prompt gambar setelah /img');

  ctx.reply('🎨 Sedang memproses gambar di AI Horde...');

  try {
    const fullPrompt = `${promptText}, score_9, score_8_up, score_7_up, masterpiece, best quality, ultra-detailed, highly detailed texture, professional photography, soft lighting, 8k resolution`;
    
    const res = await axios.post(
      'https://aihorde.net/api/v2/generate/async',
      {
        prompt: fullPrompt,
        params: {
          width: 832,
          height: 1216,
          steps: 30,
          cfg_scale: 6.0,
          sampler_name: 'k_dpmpp_2m',
          nsfw: true,
          censor_nsfw: false,
          post_processing: ['GFPGAN']
        },
        models: ['CyberRealistic Pony']
      },
      {
        headers: {
          apikey: process.env.AI_HORDE_API_KEY || '0000000000'
        }
      }
    );

    const jobId = res.data.id;

    const checkInterval = setInterval(async () => {
      try {
        const statusRes = await axios.get(`https://aihorde.net/api/v2/generate/status/${jobId}`);
        if (statusRes.data.done) {
          clearInterval(checkInterval);
          const imgUrl = statusRes.data.generations[0].img;
          await ctx.replyWithPhoto(imgUrl, { caption: `✨ Results for: ${promptText}` });
        }
      } catch (err) {
        clearInterval(checkInterval);
        ctx.reply('❌ Terjadi kesalahan saat mengecek status gambar.');
      }
    }, 3000);

  } catch (error) {
    console.error(error);
    ctx.reply('❌ Gagal membuat gambar.');
  }
});

bot.launch();
