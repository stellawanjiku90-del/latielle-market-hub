try { require('dotenv').config(); } catch (_) {}

const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('./db.cjs');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Baseline browser security headers. Keep the policy compatible with the marketplace UI.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  res.setHeader('Content-Security-Policy', "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; img-src 'self' data: blob: https:; media-src 'self' blob: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; script-src 'self'; connect-src 'self' https:; frame-src 'self' blob:;");
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

const PORT = process.env.PORT || 10000;
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be configured in production.');
}
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(48).toString('hex');

const SUPPORT_EMAIL = process.env.SUPPORT_NOTIFICATION_EMAIL || 'realityofafrica2023@gmail.com';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.6-luna';
const OPENAI_FALLBACK_MODEL = process.env.OPENAI_FALLBACK_MODEL || 'gpt-5-mini';
const aiRateWindow = new Map();
const OPENAI_TIMEOUT_MS = 25_000;
const DETAIL_REQUEST_FEE = 1000;
const ADMIN_PHONES = new Set(String(process.env.ADMIN_PHONES || '+254703927978,+254706692111').split(',').map(normalizePhone).filter(Boolean));

const OPENAI_INSTRUCTIONS = `You are the customer support assistant for LATIELLE MARKET HUB, a Kenyan marketplace for buying and selling established businesses across Kenya.

Answer questions about LATIELLE MARKET HUB using only the facts below. Write like a helpful human support representative: clear, calm, concise and conversational. Do not use corporate buzzwords, sales slogans, emojis, fake testimonials, or robotic headings. Never invent fees, listings, policies, verification results, contact details, financial figures or business information. If the answer is not in the facts below, say you do not have enough information and offer human support.

Platform facts:
- LATIELLE MARKET HUB helps people discover established businesses listed for sale across Kenya's 47 counties.
- Visitors can browse listings and search by business, category or location.
- Sellers can create listings and provide business information, photos and supporting documents.
- Account registration uses a phone number and a 4-digit PIN. The current registration verification payment is KSh 100 through M-Pesa STK Push.
- M-Pesa payments are confirmed after Safaricom returns the transaction result.
- Buyers can request confidential business information where the listing and platform rules allow it.
- Human support is available at ${SUPPORT_EMAIL}.

If the customer asks to speak to a person, tell them to use the “Talk to a person” button in this chat.`;

function allowAiRequest(key) {
  const now = Date.now();
  const windowMs = 60_000;
  const maxRequests = 12;
  const recent = (aiRateWindow.get(key) || []).filter((time) => now - time < windowMs);
  if (recent.length >= maxRequests) return false;
  recent.push(now);
  aiRateWindow.set(key, recent);
  return true;
}

function createRateLimiter({ windowMs, max, keyFn = (req) => req.ip || 'unknown' }) {
  const buckets = new Map();
  return (req, res, next) => {
    const key = String(keyFn(req));
    const now = Date.now();
    const recent = (buckets.get(key) || []).filter((time) => now - time < windowMs);
    if (recent.length >= max) {
      res.setHeader('Retry-After', String(Math.ceil(windowMs / 1000)));
      return res.status(429).json({ error: 'Too many attempts. Please wait a moment and try again.' });
    }
    recent.push(now);
    buckets.set(key, recent);
    // Prevent unbounded memory growth.
    if (buckets.size > 5000) {
      for (const [bucketKey, times] of buckets) {
        if (!times.some((time) => now - time < windowMs)) buckets.delete(bucketKey);
      }
    }
    next();
  };
}

const sensitiveRateLimit = createRateLimiter({ windowMs: 60_000, max: 10 });
const uploadRateLimit = createRateLimiter({ windowMs: 60_000, max: 30 });
const viewRateLimit = createRateLimiter({ windowMs: 60_000, max: 60, keyFn: (req) => `${req.ip}:${req.params.id}` });

function mpesaResultMessage(code, description) {
  switch (Number(code)) {
    case 1037:
      return 'M-Pesa could not reach the phone in time. Keep the phone on, connected to the Safaricom network and try the payment again.';
    case 1032:
      return 'The M-Pesa request was cancelled. Start the payment again if you still want to continue.';
    case 2001:
      return 'M-Pesa rejected the PIN entered on the phone. Start the payment again and enter the correct PIN.';
    case 1:
      return 'The M-Pesa account does not have enough balance to complete this payment.';
    default:
      return description || 'M-Pesa did not complete the payment. Please try again.';
  }
}

async function sendSupportEmail({ name, email, message, conversation }) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return false;
  const transcript = Array.isArray(conversation)
    ? conversation.slice(-20).map((item) => `${item.role === 'user' ? 'Customer' : 'LATIELLE Support'}: ${String(item.content || '').slice(0, 1200)}`).join('\n\n')
    : '';
  const body = [
    'A customer has requested human support from LATIELLE MARKET HUB.',
    '',
    `Name: ${name || 'Not provided'}`,
    `Email: ${email}`,
    `Message: ${message}`,
    '',
    'Recent chat:',
    transcript || 'No chat history provided.',
  ].join('\n');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: [SUPPORT_EMAIL],
      reply_to: email,
      subject: `LATIELLE support request from ${name || email}`,
      text: body,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Support email failed: ${text.slice(0, 300)}`);
  }
  return true;
}

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173,http://localhost:4173')
  .split(',').map((value) => value.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const requestOrigin = `${process.env.RENDER_EXTERNAL_URL || ''}`.replace(/\/$/, '');
    const hostOrigin = `http${process.env.NODE_ENV === 'production' ? 's' : ''}://${String(process.env.RENDER_EXTERNAL_HOSTNAME || '').trim()}`.replace(/\/$/, '');
    if (allowedOrigins.includes(origin) || (requestOrigin && origin === requestOrigin) || (hostOrigin && origin === hostOrigin)) return callback(null, true);
    return callback(new Error('Origin not allowed'));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-File-Name', 'X-Upload-Kind'],
  maxAge: 600,
}));

app.use(express.json({ limit: '2mb' }));

function token(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      phone: user.phone || null,
    },
    JWT_SECRET,
    {
      expiresIn: '7d',
    }
  );
}

function auth(roles) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';

    const tokenValue = header.startsWith('Bearer ')
      ? header.slice(7)
      : null;

    if (!tokenValue) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    try {
      req.user = jwt.verify(tokenValue, JWT_SECRET);

      if (
        roles &&
        !roles.includes(req.user.role)
      ) {
        return res.status(403).json({
          error: 'Forbidden',
        });
      }

      next();
    } catch {
      return res.status(401).json({
        error: 'Invalid or expired token',
      });
    }
  };
}

function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const value = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (value) { try { req.user = jwt.verify(value, JWT_SECRET); } catch {} }
  next();
}

const UPLOAD_LIMIT_BYTES = 50 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime',
  'application/pdf',
]);

app.post('/api/upload', auth(), uploadRateLimit, express.raw({ type: () => true, limit: UPLOAD_LIMIT_BYTES }), async (req, res, next) => {
  try {
    const mimeType = String(req.headers['content-type'] || '').split(';')[0].toLowerCase();
    if (!ALLOWED_UPLOAD_TYPES.has(mimeType)) {
      return res.status(415).json({ error: 'This file type is not supported. Use JPG, PNG, WEBP, GIF, MP4, WEBM, MOV or PDF.' });
    }
    const fileBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (!fileBuffer.length) return res.status(400).json({ error: 'The selected file is empty.' });
    const kind = String(req.headers['x-upload-kind'] || 'document').toLowerCase();
    const maxForKind = kind === 'video' ? UPLOAD_LIMIT_BYTES : 10 * 1024 * 1024;
    if (fileBuffer.length > maxForKind) return res.status(413).json({ error: kind === 'video' ? 'That video is too large. The maximum is 50 MB.' : 'That file is too large. The maximum is 10 MB.' });

    const signatureOk = (mime, buf) => {
      if (mime === 'image/jpeg') return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
      if (mime === 'image/png') return buf.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
      if (mime === 'image/gif') return buf.subarray(0, 6).toString() === 'GIF87a' || buf.subarray(0, 6).toString() === 'GIF89a';
      if (mime === 'image/webp') return buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP';
      if (mime === 'application/pdf') return buf.subarray(0, 5).toString() === '%PDF-';
      if (mime === 'video/webm') return buf.subarray(0, 4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]));
      if (mime === 'video/mp4' || mime === 'video/quicktime') return buf.length >= 12 && buf.subarray(4, 8).toString() === 'ftyp';
      return false;
    };
    if (!signatureOk(mimeType, fileBuffer)) return res.status(415).json({ error: 'The file contents do not match the selected file type.' });

    let filename = decodeURIComponent(String(req.headers['x-file-name'] || 'upload')).replace(/[\\/\0]/g, '').trim();
    if (!filename) filename = 'upload';
    filename = filename.slice(0, 180);
    const isPrivate = kind === 'document';
    if (!['photo', 'video', 'document'].includes(kind)) return res.status(400).json({ error: 'Invalid upload type.' });

    const result = await db.query(
      `INSERT INTO uploads(owner_id,filename,mime_type,file_size,is_private,data) VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,
      [req.user.id, filename, mimeType, fileBuffer.length, isPrivate, fileBuffer]
    );
    const id = result.rows[0].id;
    res.status(201).json({ success: true, file_url: `/api/uploads/${id}`, id, filename, mime_type: mimeType, size: fileBuffer.length });
  } catch (error) {
    next(error);
  }
});

app.get('/api/uploads/:id', optionalAuth, async (req, res, next) => {
  try {
    const result = await db.query('SELECT owner_id,is_private,mime_type,filename,file_size,data FROM uploads WHERE id=$1', [req.params.id]);
    const file = result.rows[0];
    if (!file) return res.status(404).send('File not found');
    if (file.is_private) {
      let allowed = Boolean(req.user && (req.user.id === file.owner_id || req.user.role === 'admin'));
      if (!allowed && req.user) {
        const marker = `/api/uploads/${req.params.id}`;
        const access = await db.query(`SELECT 1 FROM detail_requests dr JOIN listings l ON l.id=dr.listing_id WHERE dr.buyer_id=$1 AND dr.status IN ('approved','responded') AND l.metadata::text LIKE $2 LIMIT 1`,[req.user.id,`%${marker}%`]);
        allowed = Boolean(access.rows[0]);
      }
      if (!allowed) return res.status(403).send('File is private');
    }
    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Length', String(file.file_size));
    const disposition = String(req.query.download || '') === '1' ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', `${disposition}; filename="${String(file.filename).replace(/"/g, '')}"`);
    res.setHeader('Cache-Control', file.is_private ? 'private, max-age=300' : 'public, max-age=31536000, immutable');
    res.send(file.data);
  } catch (error) {
    next(error);
  }
});

/* =====================================================
   HEALTH CHECK
===================================================== */

app.get('/api/health', async (_req, res) => {
  let database = false;
  try {
    await db.query('SELECT 1');
    database = true;
  } catch (error) {
    console.warn('Health check: database unavailable:', error?.message || error);
  }

  // Render should use this endpoint to verify that the web process is alive.
  // Database/API integrations are reported separately and must not make the
  // frontend unreachable during a temporary database outage.
  res.status(200).json({
    ok: true,
    database,
    ai: Boolean(process.env.OPENAI_API_KEY),
    email: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL),
  });
});

/* =====================================================
   AUTHENTICATION
===================================================== */

app.post('/api/auth/register', sensitiveRateLimit, async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      role = 'buyer',
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'Name, email and password are required',
      });
    }

    if (!['buyer', 'seller'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
      });
    }

    const hash = await bcrypt.hash(password, 12);

    const result = await db.query(
      `
      INSERT INTO users (
        name,
        email,
        password_hash,
        role
      )
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role
      `,
      [
        name,
        email.toLowerCase(),
        hash,
        role,
      ]
    );

    const user = result.rows[0];

    res.status(201).json({
      user,
      token: token(user),
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'Email already registered',
      });
    }

    next(error);
  }
});

app.post('/api/auth/login', sensitiveRateLimit, async (req, res, next) => {
  try {
    const {
      email,
      password,
    } = req.body;

    const result = await db.query(
      `
      SELECT *
      FROM users
      WHERE email = $1
      `,
      [
        String(email || '').toLowerCase(),
      ]
    );

    const databaseUser = result.rows[0];

    if (
      !databaseUser ||
      !(await bcrypt.compare(
        password || '',
        databaseUser.password_hash
      ))
    ) {
      return res.status(401).json({
        error: 'Invalid email or password',
      });
    }

    const user = {
      id: databaseUser.id,
      name: databaseUser.name,
      email: databaseUser.email,
      role: databaseUser.role,
    };

    res.json({
      user,
      token: token(user),
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/me', auth(), async (req, res, next) => {
  try {
    const result = await db.query(
      `
      SELECT
        id,
        name,
        email,
        role,
        phone,
        favorites,
        bio,
        county,
        subcounty,
        profile_picture,
        phone_verified,
        verification_status,
        name_locked,
        created_at
      FROM users
      WHERE id = $1
      `,
      [req.user.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/* =====================================================
   LISTINGS
===================================================== */

app.post('/api/listings/:id/view', optionalAuth, viewRateLimit, async (req,res,next)=>{
  try {
    const result=await db.query(`UPDATE listings SET metadata=jsonb_set(metadata,'{views_count}',to_jsonb(COALESCE((metadata->>'views_count')::integer,0)+1),true) WHERE id=$1 AND status IN ('approved','active') RETURNING metadata->>'views_count' AS views_count`,[req.params.id]);
    if(!result.rows[0]) return res.status(404).json({error:'Listing not found'});
    res.json({success:true,views_count:Number(result.rows[0].views_count||0)});
  } catch(e){next(e)}
});

app.get('/api/listings', async (req, res, next) => {
  try {
    const result = await db.query(
      `
      SELECT
        l.*,
        u.name AS seller_name
      FROM listings l
      JOIN users u
        ON u.id = l.seller_id
      WHERE ($1::text IS NULL OR l.status = $1 OR ($1 = 'active' AND l.status = 'approved'))
      ORDER BY l.created_at DESC
      `,
      [
        req.query.status || 'active',
      ]
    );

    res.json(result.rows.map((row) => publicEntity('BusinessListing', row, { includePrivate: false })));
  } catch (error) {
    next(error);
  }
});

app.get('/api/listings/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      `
      SELECT
        l.*,
        u.name AS seller_name
      FROM listings l
      JOIN users u
        ON u.id = l.seller_id
      WHERE l.id = $1
      `,
      [req.params.id]
    );

    if (!result.rows[0] || !['approved','active'].includes(result.rows[0].status)) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.json(publicEntity('BusinessListing', result.rows[0], { includePrivate: false }));
  } catch (error) {
    next(error);
  }
});

app.post(
  '/api/listings',
  auth(['seller', 'admin']),
  async (req, res, next) => {
    try {
      const d=req.body||{};
      if (!d.title || !d.description || !d.price || !d.category || !d.county || !d.town) return res.status(400).json({error:'Required listing information is missing.'});
      if (!Array.isArray(d.photos) || !d.photos.length) return res.status(400).json({error:'At least one business photo is required.'});
      if (!Array.isArray(d.videos) || !d.videos.length) return res.status(400).json({error:'A business video is required.'});
      for (const field of ['business_licence','registration_cert','owner_id_docs']) if(!Array.isArray(d[field]) || !d[field].length) return res.status(400).json({error:'All confidential verification documents are required.'});
      const metadata={...d}; for(const k of ['title','description','price','status']) delete metadata[k];
      const result=await db.query(`INSERT INTO listings(seller_id,title,description,price,status,metadata,payment_status) VALUES($1,$2,$3,$4,'pending',$5,'unpaid') RETURNING *`,[req.user.id,d.title,String(d.description).slice(0,12000),Number(d.price),JSON.stringify(metadata)]);
      res.status(201).json(publicEntity('BusinessListing',result.rows[0],{includePrivate:true}));
    } catch (error) { next(error); }
  }
);

app.patch(
  '/api/listings/:id',
  auth(['seller', 'admin']),
  async (req, res, next) => {
    try {
      const existing = await db.query(
        `
        SELECT *
        FROM listings
        WHERE id = $1
        `,
        [req.params.id]
      );

      if (!existing.rows[0]) {
        return res.status(404).json({
          error: 'Listing not found',
        });
      }

      if (
        req.user.role !== 'admin' &&
        existing.rows[0].seller_id !== req.user.id
      ) {
        return res.status(403).json({
          error: 'Forbidden',
        });
      }

      const { title, description, price, status } = req.body;
      if (req.user.role !== 'admin' && status !== undefined) return res.status(403).json({error:'Only the admin team can change listing approval status.'});
      const result = await db.query(
        `UPDATE listings SET title=COALESCE($2,title),description=COALESCE($3,description),price=COALESCE($4,price),status=COALESCE($5,status),updated_at=NOW() WHERE id=$1 RETURNING *`,
        [req.params.id,title,description,price,status]
      );

      res.json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }
);

app.delete(
  '/api/listings/:id',
  auth(['seller', 'admin']),
  async (req, res, next) => {
    try {
      const result = await db.query(
        `
        DELETE FROM listings
        WHERE
          id = $1
          AND (
            $2::boolean
            OR seller_id = $3
          )
        RETURNING id
        `,
        [
          req.params.id,
          req.user.role === 'admin',
          req.user.id,
        ]
      );

      if (!result.rows[0]) {
        return res.status(404).json({
          error: 'Listing not found or forbidden',
        });
      }

      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
);

/* =====================================================
   DASHBOARDS
===================================================== */

app.get(
  '/api/dashboard/seller',
  auth(['seller', 'admin']),
  async (req, res, next) => {
    try {
      const result = await db.query(
        `
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (
            WHERE status = 'active'
          ) AS active,
          COALESCE(
            SUM(price) FILTER (
              WHERE status = 'sold'
            ),
            0
          ) AS sold_value
        FROM listings
        WHERE seller_id = $1
        `,
        [req.user.id]
      );

      res.json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }
);

app.get(
  '/api/dashboard/admin',
  auth(['admin']),
  async (_req, res, next) => {
    try {
      const [users, listings] = await Promise.all([
        db.query(
          `
          SELECT COUNT(*) AS total_users
          FROM users
          `
        ),
        db.query(
          `
          SELECT COUNT(*) AS total_listings
          FROM listings
          `
        ),
      ]);

      res.json({
        ...users.rows[0],
        ...listings.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =====================================================
   DETAIL REQUESTS
===================================================== */

app.post(
  '/api/requests',
  auth(),
  async (req, res, next) => {
    try {
      const {
        listing_id,
        message = '',
      } = req.body;

      if (!listing_id) {
        return res.status(400).json({
          error: 'listing_id is required',
        });
      }

      const result = await db.query(
        `
        INSERT INTO detail_requests (
          listing_id,
          buyer_id,
          message
        )
        VALUES ($1, $2, $3)
        RETURNING *
        `,
        [
          listing_id,
          req.user.id,
          message,
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }
);

app.get(
  '/api/requests/mine',
  auth(),
  async (req, res, next) => {
    try {
      const result = await db.query(
        `
        SELECT *
        FROM detail_requests
        WHERE buyer_id = $1
        ORDER BY created_at DESC
        `,
        [req.user.id]
      );

      res.json(result.rows);
    } catch (error) {
      next(error);
    }
  }
);

/* =====================================================
   PAYMENT CALLBACK
===================================================== */

/* =====================================================
   PHONE AUTHENTICATION
===================================================== */
function normalizePhone(phone) {
  let value = String(phone || '').trim().replace(/[\s-]/g, '');
  if (value.startsWith('00')) value = '+' + value.slice(2);
  if (value.startsWith('0') && value.length === 10) value = '+254' + value.slice(1);
  if (/^254\d{9}$/.test(value)) value = '+' + value;
  return value;
}

function isKenyanPhone(phone) {
  return /^\+254[17]\d{8}$/.test(normalizePhone(phone));
}

function mpesaConfig() {
  const required = ['MPESA_SHORTCODE', 'MPESA_PASSKEY', 'MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET', 'MPESA_CALLBACK_URL'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Missing M-Pesa environment variables: ${missing.join(', ')}`);
  const production = (process.env.MPESA_ENV || 'production').toLowerCase() === 'production';
  return {
    baseUrl: production ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke',
    shortcode: process.env.MPESA_SHORTCODE,
    passkey: process.env.MPESA_PASSKEY,
    consumerKey: process.env.MPESA_CONSUMER_KEY,
    consumerSecret: process.env.MPESA_CONSUMER_SECRET,
    callbackUrl: process.env.MPESA_CALLBACK_URL,
    partyB: process.env.MPESA_PARTY_B || process.env.MPESA_SHORTCODE,
    transactionType: process.env.MPESA_TRANSACTION_TYPE || 'CustomerPayBillOnline',
  };
}

function validateMpesaStkConfig(cfg) {
  const allowed = new Set(['CustomerPayBillOnline', 'CustomerBuyGoodsOnline']);
  if (!allowed.has(cfg.transactionType)) {
    throw new Error('MPESA_TRANSACTION_TYPE must be CustomerPayBillOnline or CustomerBuyGoodsOnline.');
  }
  if (!/^https:\/\//.test(cfg.callbackUrl)) {
    throw new Error('MPESA_CALLBACK_URL must be a public HTTPS URL.');
  }
}

async function mpesaAccessToken() {
  const cfg = mpesaConfig();
  validateMpesaStkConfig(cfg);
  const credentials = Buffer.from(`${cfg.consumerKey}:${cfg.consumerSecret}`).toString('base64');
  const response = await fetch(`${cfg.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  });
  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = { raw: raw.slice(0, 500) }; }
  if (!response.ok || !data.access_token) {
    console.error('M-Pesa OAuth failed', { status: response.status, response: data });
    throw new Error(data.errorMessage || data.error_description || data.error || `M-Pesa OAuth failed (${response.status})`);
  }
  return { token: data.access_token, cfg };
}

function mpesaPassword(shortcode, passkey, timestamp) {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
}
function phoneUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    phone_number: row.phone,
    full_name: row.name || '',
    email: row.email || '',
    role: row.role,
    is_verified: row.phone_verified,
    has_pin: row.has_pin,
    bio: row.bio,
    gender: row.gender,
    county: row.county,
    subcounty: row.subcounty,
    profile_picture: row.profile_picture,
    favorites: row.favorites || [],
    verification_status: row.verification_status || 'unverified',
    name_locked: Boolean(row.name_locked),
  };
}

app.post('/api/auth/register-payment', sensitiveRateLimit, async (req, res, next) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const role = ['buyer', 'seller'].includes(req.body.role) ? req.body.role : 'buyer';
    const pin = String(req.body.pin || '');
    const name = String(req.body.name || '').trim().replace(/\s+/g, ' ').slice(0, 120);
    if (!isKenyanPhone(phone)) return res.status(400).json({ error: 'Enter a valid Kenyan mobile number.' });
    if (!/^\d{4}$/.test(pin)) return res.status(400).json({ error: 'PIN must be exactly 4 digits.' });

    const existing = await db.query('SELECT id, phone_verified FROM users WHERE phone=$1 AND role=$2', [phone, role]);
    if (existing.rows[0]) {
      return res.status(409).json({ error: existing.rows[0].phone_verified ? `This phone number already has a ${role} account. Choose ${role === 'buyer' ? 'Seller' : 'Buyer'} if you want to access your other role.` : 'This phone number already has a registration in progress for this role.' });
    }

    const pinHash = await bcrypt.hash(pin, 12);
    await db.query(`
      INSERT INTO pending_registrations(phone, role, pin_hash, amount, name, status, updated_at)
      VALUES($1,$2,$3,100,$4,'pending',NOW())
      ON CONFLICT(phone, role) DO UPDATE SET pin_hash=EXCLUDED.pin_hash, amount=100, name=EXCLUDED.name, status='pending', merchant_request_id=NULL, checkout_request_id=NULL, mpesa_receipt=NULL, result_code=NULL, result_description=NULL, updated_at=NOW()
    `, [phone, role, pinHash, name]);

    const { token: accessToken, cfg } = await mpesaAccessToken();
    const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
    const password = mpesaPassword(cfg.shortcode, cfg.passkey, timestamp);
    const response = await fetch(`${cfg.baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        BusinessShortCode: cfg.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: cfg.transactionType,
        Amount: 100,
        PartyA: phone.slice(1),
        PartyB: cfg.partyB,
        PhoneNumber: phone.slice(1),
        CallBackURL: cfg.callbackUrl,
        AccountReference: 'LATIELLE',
        TransactionDesc: 'Account Verify',
      }),
    });
    const raw = await response.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch { data = { raw: raw.slice(0, 500) }; }
    if (!response.ok || data.ResponseCode !== '0') {
      console.error('M-Pesa STK push rejected', { status: response.status, response: data });
      return res.status(502).json({
        error: 'M-Pesa payment request could not be started. Please try again in a moment.',
      });
    }

    if (!data.CheckoutRequestID) {
      console.error('M-Pesa STK response missing CheckoutRequestID', { response: data });
      return res.status(502).json({ error: 'M-Pesa payment request could not be started. Please try again.' });
    }

    console.log('M-Pesa STK accepted', {
      responseCode: data.ResponseCode,
      merchantRequestId: data.MerchantRequestID || null,
      checkoutRequestId: data.CheckoutRequestID,
      transactionType: cfg.transactionType,
      partyB: cfg.partyB,
      environment: (process.env.MPESA_ENV || 'production').toLowerCase(),
      phoneLast4: phone.slice(-4),
    });

    await db.query(`UPDATE pending_registrations SET merchant_request_id=$2, checkout_request_id=$3, updated_at=NOW() WHERE phone=$1 AND role=$4`, [phone, data.MerchantRequestID || null, data.CheckoutRequestID, role]);

    res.json({ success: true, checkoutRequestId: data.CheckoutRequestID, message: 'M-Pesa payment request accepted. Check your phone for the prompt.' });
  } catch (e) { next(e); }
});

app.get('/api/auth/registration-status/:checkoutRequestId', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store');
    const checkoutId = String(req.params.checkoutRequestId || '');
    const r = await db.query('SELECT * FROM pending_registrations WHERE checkout_request_id=$1', [checkoutId]);
    const pending = r.rows[0];
    if (!pending) return res.status(404).json({ error: 'Registration payment not found.' });
    if (pending.status === 'paid') {
      const u = (await db.query('SELECT * FROM users WHERE phone=$1 AND role=$2', [pending.phone, pending.role])).rows[0];
      if (u) return res.json({ success: true, status: 'paid', user: phoneUser(u), token: token(u) });
    }
    const resultCode = pending.result_code ?? null;
    res.json({
      success: true,
      status: pending.status,
      resultCode,
      reason: pending.status === 'failed' ? mpesaResultMessage(resultCode, pending.result_description) : (pending.result_description || null),
      retryAllowed: pending.status === 'failed',
    });
  } catch (e) { next(e); }
});

app.post('/api/payments/mpesa/callback', async (req, res, next) => {
  try {
    await db.query(`INSERT INTO payment_events(provider,payload) VALUES($1,$2)`, ['mpesa', JSON.stringify(req.body)]);
    const stk = req.body?.Body?.stkCallback;
    const checkoutId = stk?.CheckoutRequestID;
    const resultCode = Number(stk?.ResultCode);
    const resultDescription = String(stk?.ResultDesc || '');
    if (!checkoutId) return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

    const pendingRegistration = (await db.query('SELECT * FROM pending_registrations WHERE checkout_request_id=$1',[checkoutId])).rows[0];
    if (pendingRegistration) {
      if (resultCode === 0) {
        const items = stk.CallbackMetadata?.Item || [];
        const getItem = (name) => items.find((item) => item.Name === name)?.Value;
        const amount = Number(getItem('Amount') || 0);
        const receipt = getItem('MpesaReceiptNumber') || null;
        const phone = normalizePhone(getItem('PhoneNumber') ? String(getItem('PhoneNumber')) : pendingRegistration.phone);
        if (amount !== 100 || phone !== pendingRegistration.phone) {
          await db.query(`UPDATE pending_registrations SET status='failed',result_code=$2,result_description=$3,updated_at=NOW() WHERE id=$1`,[pendingRegistration.id,1,'Callback validation failed: amount or phone number did not match.']);
        } else {
          const client = await db.pool?.connect?.();
          if (client) {
            try {
              await client.query('BEGIN');
              const existing = await client.query('SELECT * FROM users WHERE phone=$1 AND role=$2 FOR UPDATE',[pendingRegistration.phone, pendingRegistration.role]);
              if (!existing.rows[0]) {
                const accountEmail = `phone+${pendingRegistration.phone.replace(/[^0-9]/g, '')}+${pendingRegistration.role}@latielle.local`;
                await client.query(`INSERT INTO users(name,email,password_hash,role,phone,phone_verified,pin_hash,has_pin,verification_status,name_locked,verified_at) VALUES($1,$2,$3,$4,$5,true,$6,true,'verified',true,NOW())`,[pendingRegistration.name,accountEmail,await bcrypt.hash(crypto.randomUUID(),8),pendingRegistration.role,pendingRegistration.phone,pendingRegistration.pin_hash]);
              }
              await client.query(`UPDATE pending_registrations SET status='paid',mpesa_receipt=$2,result_code=0,result_description=$3,updated_at=NOW() WHERE id=$1`,[pendingRegistration.id,receipt,resultDescription || 'Payment completed successfully']);
              await client.query('COMMIT');
            } catch(txError){await client.query('ROLLBACK');throw txError;} finally{client.release();}
          } else {
            const accountEmail = `phone+${pendingRegistration.phone.replace(/[^0-9]/g, '')}+${pendingRegistration.role}@latielle.local`;
            await db.query(`INSERT INTO users(name,email,password_hash,role,phone,phone_verified,pin_hash,has_pin,verification_status,name_locked,verified_at) VALUES($1,$2,$3,$4,$5,true,$6,true,'verified',true,NOW()) ON CONFLICT(phone,role) DO NOTHING`,[pendingRegistration.name,accountEmail,await bcrypt.hash(crypto.randomUUID(),8),pendingRegistration.role,pendingRegistration.phone,pendingRegistration.pin_hash]);
            await db.query(`UPDATE pending_registrations SET status='paid',mpesa_receipt=$2,result_code=0,result_description=$3,updated_at=NOW() WHERE id=$1`,[pendingRegistration.id,receipt,resultDescription || 'Payment completed successfully']);
          }
        }
      } else {
        await db.query(`UPDATE pending_registrations SET status='failed',result_code=$2,result_description=$3,updated_at=NOW() WHERE id=$1`,[pendingRegistration.id,resultCode,mpesaResultMessage(resultCode,resultDescription)]);
      }
      return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const detail = (await db.query(`SELECT dr.*,u.phone buyer_phone FROM detail_requests dr JOIN users u ON u.id=dr.buyer_id WHERE dr.checkout_request_id=$1 FOR UPDATE`,[checkoutId])).rows[0];
    if (detail) {
      if (detail.payment_status === 'paid') return res.json({ ResultCode: 0, ResultDesc: 'Already processed' });
      if (resultCode === 0) {
        const items = stk.CallbackMetadata?.Item || [];
        const getItem = (name) => items.find((item) => item.Name === name)?.Value;
        const amount = Number(getItem('Amount') || 0);
        const receipt = getItem('MpesaReceiptNumber') || null;
        const phone = normalizePhone(getItem('PhoneNumber') ? String(getItem('PhoneNumber')) : detail.buyer_phone);
        if (amount !== DETAIL_REQUEST_FEE || phone !== normalizePhone(detail.buyer_phone)) {
          await db.query(`UPDATE detail_requests SET payment_status='failed',status='pending_payment',updated_at=NOW(),rejection_reason=$2 WHERE id=$1`,[detail.id,'Payment callback validation failed. Please start the payment again.']);
        } else {
          const paidUpdate = await db.query(`UPDATE detail_requests SET payment_status='paid',amount_paid=$2,mpesa_receipt=$3,status='pending_approval',updated_at=NOW() WHERE id=$1 AND payment_status <> 'paid' RETURNING id`,[detail.id,DETAIL_REQUEST_FEE,receipt]);
          if (paidUpdate.rows[0]) {
            await db.query(`INSERT INTO entity_records(entity_name,data) VALUES('Transaction',$1)`,[JSON.stringify({user_email:detail.buyer_phone,phone_number:detail.buyer_phone,amount:DETAIL_REQUEST_FEE,service_type:'detail_request',reference_id:detail.id,mpesa_receipt:receipt,status:'successful',checkout_request_id:checkoutId,description:'Successful M-Pesa payment for confidential business details'})]);
          }
        }
      } else {
        await db.query(`UPDATE detail_requests SET payment_status='failed',status='pending_payment',updated_at=NOW(),rejection_reason=$2 WHERE id=$1`,[detail.id,mpesaResultMessage(resultCode,resultDescription)]);
      }
    }

    const listing = (await db.query(`SELECT l.*,u.phone seller_phone FROM listings l JOIN users u ON u.id=l.seller_id WHERE l.checkout_request_id=$1`,[checkoutId])).rows[0];
    if (listing) {
      if (listing.payment_status === 'paid') return res.json({ ResultCode: 0, ResultDesc: 'Already processed' });
      if (resultCode === 0) {
        const items = stk.CallbackMetadata?.Item || [];
        const getItem = (name) => items.find((item) => item.Name === name)?.Value;
        const amount = Number(getItem('Amount') || 0);
        const receipt = getItem('MpesaReceiptNumber') || null;
        const phone = normalizePhone(getItem('PhoneNumber') ? String(getItem('PhoneNumber')) : (listing.metadata?.payment_phone || listing.seller_phone));
        const expectedPaymentPhone = normalizePhone(listing.metadata?.payment_phone || listing.seller_phone);
        if (amount !== Number(listing.payment_amount) || phone !== expectedPaymentPhone) {
          await db.query(`UPDATE listings SET payment_status='failed',updated_at=NOW() WHERE id=$1`,[listing.id]);
        } else {
          const paid = await db.query(`UPDATE listings SET payment_status='paid',mpesa_receipt=$2,status='pending',updated_at=NOW() WHERE id=$1 AND payment_status <> 'paid' RETURNING id`,[listing.id,receipt]);
          if (paid.rows[0]) await db.query(`INSERT INTO entity_records(entity_name,data) VALUES('Transaction',$1)`,[JSON.stringify({user_email:listing.seller_phone,phone_number:listing.seller_phone,amount,service_type:`${listing.metadata?.listing_type || 'basic'}_listing`,reference_id:listing.id,mpesa_receipt:receipt,status:'successful',checkout_request_id:checkoutId,description:'Successful M-Pesa listing fee payment'})]);
        }
      } else {
        await db.query(`UPDATE listings SET payment_status='failed',updated_at=NOW() WHERE id=$1`,[listing.id]);
      }
    }
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (error) { next(error); }
});

app.post('/api/auth/login-pin', sensitiveRateLimit, async (req,res,next)=>{
  try {
    const phone=normalizePhone(req.body.phone), pin=String(req.body.pin||'');
    const requestedRole = String(req.body.role || '').toLowerCase();
    if (!isKenyanPhone(phone) || !/^\d{4}$/.test(pin) || !['buyer','seller','admin'].includes(requestedRole)) {
      return res.status(401).json({error:'Select an account type and enter a valid phone number and 4-digit PIN.'});
    }
    if (requestedRole === 'admin' && !ADMIN_PHONES.has(phone)) {
      return res.status(401).json({error:'This phone number is not authorised for administrator access.'});
    }

    // Phone numbers may have separate buyer, seller and admin accounts.
    let u=(await db.query(`SELECT * FROM users WHERE phone=$1 AND role=$2`,[phone, requestedRole])).rows[0];

    // Older migrations could leave an allowlisted administrator without its
    // dedicated admin row. Restore that row without replacing buyer/seller data.
    if (!u && requestedRole === 'admin') {
      const source=(await db.query(
        `SELECT * FROM users WHERE phone=$1 AND phone_verified=true AND pin_hash IS NOT NULL
         ORDER BY CASE role WHEN 'admin' THEN 0 WHEN 'seller' THEN 1 ELSE 2 END LIMIT 1`, [phone]
      )).rows[0];
      if (source) {
        const accountEmail=`admin+${phone.replace(/[^0-9]/g, '')}@latielle.local`;
        u=(await db.query(
          `INSERT INTO users(name,email,password_hash,role,phone,phone_verified,pin_hash,has_pin,verification_status,name_locked,verified_at)
           VALUES($1,$2,$3,'admin',$4,true,$5,true,'verified',true,COALESCE($6,NOW()))
           ON CONFLICT(phone,role) DO UPDATE SET pin_hash=EXCLUDED.pin_hash,has_pin=true,phone_verified=true,verification_status='verified'
           RETURNING *`,
          [source.name,accountEmail,source.password_hash,phone,source.pin_hash,source.verified_at]
        )).rows[0];
      }
    }
    if (!u || !u.phone_verified || !u.pin_hash) {
      return res.status(401).json({error: requestedRole === 'admin'
        ? 'No verified administrator account was found for this phone number. Please contact platform support.'
        : `No verified ${requestedRole} account was found for this phone number. Register this role first.`});
    }
    if (u.pin_locked_until && new Date(u.pin_locked_until) > new Date()) return res.status(429).json({error:'Too many failed attempts. Please try again later.'});
    const valid = await bcrypt.compare(pin,u.pin_hash);
    if (!valid) {
      const attempts = Number(u.failed_login_attempts || 0) + 1;
      const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60_000) : null;
      await db.query('UPDATE users SET failed_login_attempts=$2,pin_locked_until=$3 WHERE id=$1',[u.id, lockedUntil ? 5 : attempts, lockedUntil]);
      return res.status(401).json({error:'Invalid phone number or PIN'});
    }
    await db.query('UPDATE users SET failed_login_attempts=0,pin_locked_until=NULL WHERE id=$1',[u.id]);
    res.json({success:true,user:phoneUser(u),token:token(u)});
  }catch(e){next(e)}
});

app.post('/api/auth/set-pin', auth(), async (req,res,next)=>{
  try { const pin=String(req.body.pin||''); if(!/^\d{4}$/.test(pin)) return res.status(400).json({error:'PIN must be exactly 4 digits'}); const hash=await bcrypt.hash(pin,12); const r=await db.query('UPDATE users SET pin_hash=$2,has_pin=true WHERE id=$1 RETURNING *',[req.user.id,hash]); if(!r.rows[0])return res.status(404).json({error:'User not found'}); res.json({success:true,user:phoneUser(r.rows[0])}); }catch(e){next(e)}
});

app.patch('/api/auth/profile', auth(), async (req,res,next)=>{
  try {
    const current = (await db.query('SELECT * FROM users WHERE id=$1',[req.user.id])).rows[0];
    if (!current) return res.status(404).json({error:'User not found'});
    const allowed=['bio','gender','county','subcounty','profile_picture','national_id','selfie_url','id_document_url','favorites','business_docs'];
    const sets=[], vals=[req.user.id];
    for(const k of allowed) if(req.body[k]!==undefined){sets.push(`${k}=$${vals.length+1}`); vals.push(typeof req.body[k]==='object'?JSON.stringify(req.body[k]):req.body[k]);}
    if (req.body.name !== undefined || req.body.full_name !== undefined) {
      if (current.name_locked) return res.status(403).json({error:'Your verified name cannot be changed.'});
      const newName=String(req.body.name ?? req.body.full_name ?? '').trim();
      if (newName) { sets.push(`name=$${vals.length+1}`); vals.push(newName); }
    }
    if(!sets.length) return res.json(phoneUser(current));
    const r=await db.query(`UPDATE users SET ${sets.join(',')} WHERE id=$1 RETURNING *`,vals);
    res.json(phoneUser(r.rows[0]));
  }catch(e){next(e)}
});

/* =====================================================
   GENERIC ENTITY API FOR MIGRATED FRONTEND
===================================================== */
const entityMap = { PhoneUser:'users', User:'users', BusinessListing:'listings', DetailRequest:'detail_requests' };

function publicEntity(name,row, options={}){
  if(!row) return null;
  if(name==='PhoneUser') return phoneUser(row);
  if(name==='User') { const safe={...row, name:row.name, phone:row.phone, favorites:row.favorites||[]}; delete safe.password_hash; delete safe.pin_hash; return safe; }
  if(name==='BusinessListing') {
    const raw = {...(row.metadata || {})};
    const publicFields = ['asking_price','category','county','sub_county','town','listing_type','years_operating','employees','reason_for_selling','monthly_gross_sales','monthly_net_sales','financial_records_available','photos','videos','is_verified','views_count','sold_at','sold_price'];
    const metadata = options.includePrivate ? raw : Object.fromEntries(publicFields.filter((key) => raw[key] !== undefined).map((key) => [key, raw[key]]));
    const base = {...row, ...(metadata), created_date:row.created_at};
    if (!options.includePrivate) {
      delete base.seller_id;
      delete base.seller_email;
      delete base.metadata;
    }
    return base;
  }
  if(name==='DetailRequest') {
    return {
      id: row.id,
      listing_id: row.listing_id,
      buyer_email: row.buyer_phone || row.buyer_email || '',
      seller_email: row.seller_email || '',
      listing_title: row.listing_title || '',
      status: row.status,
      payment_status: row.payment_status,
      amount_paid: Number(row.amount_paid || 0),
      mpesa_receipt: row.mpesa_receipt || null,
      checkout_request_id: row.checkout_request_id || null,
      message: row.message || '',
      rejection_reason: row.rejection_reason || '',
      admin_response: row.admin_response || '',
      response_history: row.response_history || [],
      responded_at: row.responded_at || null,
      created_date: row.created_at,
      updated_date: row.updated_at || row.created_at,
    };
  }
  return row;
}

function isAdmin(req){ return req.user?.role === 'admin'; }

app.get('/api/entities/:entity', optionalAuth, async (req,res,next)=>{
 try{
  const name=req.params.entity;
  if(name!=='BusinessListing' && !req.user) return res.status(401).json({error:'Authentication required'});
  const filters=req.query.filters?JSON.parse(req.query.filters):{};
  const limit=Math.min(Math.max(Number(req.query.limit)||100,1),500);

  if(name==='BusinessListing'){
    const vals=[]; const clauses=[];
    if(filters.created_by){
      if(!req.user) return res.status(401).json({error:'Authentication required'});
      // Tokens issued by older deployments did not carry the phone number.
      // Resolve the current account once so role-specific accounts continue to
      // work after an upgrade without forcing users to log out first.
      const owner = (await db.query('SELECT id, phone, email FROM users WHERE id=$1',[req.user.id])).rows[0];
      const identifier=String(owner?.phone || owner?.email || owner?.id || '');
      if(!isAdmin(req) && String(filters.created_by)!==identifier && String(filters.created_by)!==String(owner?.id || '')) return res.status(403).json({error:'Forbidden'});
      vals.push(filters.created_by);clauses.push(`(u.email=$${vals.length} OR u.phone=$${vals.length} OR u.id::text=$${vals.length})`);
    }
    if(filters.status){vals.push(filters.status);clauses.push(`l.status=$${vals.length}`)}
    // Public users may see active listings and the intentionally public sold archive.
    // Owners/admins can also see their own drafts.
    if(!isAdmin(req) && !filters.created_by && filters.status !== 'sold') clauses.push(`l.status IN ('approved','active')`);
    let q=`SELECT l.*,u.name seller_name,u.email seller_email FROM listings l JOIN users u ON u.id=l.seller_id`;
    if(clauses.length) q+=' WHERE '+clauses.join(' AND ');
    q+=` ORDER BY l.created_at DESC LIMIT ${limit}`;
    const rows=(await db.query(q,vals)).rows;
    return res.json(rows.map(r=>publicEntity(name,r,{includePrivate:isAdmin(req) || r.seller_id===req.user?.id})));
  }

  if(name==='PhoneUser' || name==='User'){
    if (!isAdmin(req) && filters.id && filters.id !== req.user.id) return res.status(403).json({error:'Forbidden'});
    const vals=[]; const clauses=[];
    for(const [k,v] of Object.entries(filters)){
      const col=k==='phone_number'?'phone':k==='full_name'?'name':k;
      if(['id','phone','name','role','verification_status'].includes(col)){ vals.push(v); clauses.push(`${col}=$${vals.length}`); }
    }
    if(!isAdmin(req) && !clauses.some(c=>c.startsWith('id='))) { vals.push(req.user.id); clauses.push(`id=$${vals.length}`); }
    const where=clauses.length?' WHERE '+clauses.join(' AND '):'';
    const r=await db.query(`SELECT * FROM users${where} ORDER BY created_at DESC LIMIT ${limit}`,vals);
    return res.json(r.rows.map(x=>publicEntity(name,x)));
  }

  if(name==='DetailRequest'){
    if(!['buyer','seller','admin'].includes(req.user.role)) return res.status(403).json({error:'Forbidden'});
    const vals=[]; const clauses=[];
    if (req.user.role === 'buyer') { vals.push(req.user.id); clauses.push(`dr.buyer_id=$${vals.length}`); }
    if (req.user.role === 'seller') { vals.push(req.user.id); clauses.push(`l.seller_id=$${vals.length}`); clauses.push(`dr.payment_status='paid'`); }
    if (req.user.role === 'admin') { clauses.push(`dr.payment_status='paid'`); }
    if(filters.buyer_email){ vals.push(filters.buyer_email); clauses.push(`bu.phone=$${vals.length}`); }
    if(filters.seller_email){ vals.push(filters.seller_email); clauses.push(`(su.phone=$${vals.length} OR su.email=$${vals.length})`); }
    if(filters.payment_status){ vals.push(filters.payment_status); clauses.push(`dr.payment_status=$${vals.length}`); }
    let q=`SELECT dr.*,bu.phone buyer_phone,su.email seller_email,l.title listing_title FROM detail_requests dr JOIN users bu ON bu.id=dr.buyer_id JOIN listings l ON l.id=dr.listing_id JOIN users su ON su.id=l.seller_id`;
    if(clauses.length) q+=' WHERE '+clauses.join(' AND ');
    q+=` ORDER BY dr.created_at DESC LIMIT ${limit}`;
    return res.json((await db.query(q,vals)).rows.map(r=>publicEntity(name,r)));
  }

  const vals=[name]; const clauses=['entity_name=$1'];
  // Generic application records are admin-only except a small owner-scoped set.
  if(!isAdmin(req) && ['Transaction','Report','SupportRequest','Notification','Conversation','BuyerPreference'].includes(name)) {
    const owner = (await db.query('SELECT phone, email FROM users WHERE id=$1',[req.user.id])).rows[0];
    const identities = [owner?.phone, owner?.email, req.user.id].filter(Boolean);
    const placeholders = identities.map((value) => { vals.push(value); return `$${vals.length}`; });
    clauses.push(`(data->>'user_email' IN (${placeholders.join(',')}) OR data->>'buyer_email' IN (${placeholders.join(',')}) OR data->>'seller_email' IN (${placeholders.join(',')}) OR data->>'recipient_email' IN (${placeholders.join(',')}) OR data->>'user_id' IN (${placeholders.join(',')}))`);
  }
  const r=await db.query(`SELECT id,data,created_at,updated_at FROM entity_records WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC LIMIT ${limit}`,vals);
  res.json(r.rows.map(x=>({id:x.id,created_date:x.created_at,updated_date:x.updated_at,...x.data})));
 }catch(e){next(e)}
});

app.get('/api/entities/:entity/:id', optionalAuth, async(req,res,next)=>{
 try{
  const n=req.params.entity,id=req.params.id;
  if(n!=='BusinessListing' && !req.user) return res.status(401).json({error:'Authentication required'});
  if(n==='BusinessListing'){
    const row=(await db.query(`SELECT l.*,u.name seller_name,u.email seller_email FROM listings l JOIN users u ON u.id=l.seller_id WHERE l.id=$1`,[id])).rows[0];
    if(!row) return res.status(404).json({error:'Not found'});
    if(!isAdmin(req) && row.status!=='approved' && row.status!=='active' && row.seller_id!==req.user?.id) return res.status(404).json({error:'Not found'});
    return res.json(publicEntity(n,row,{includePrivate:isAdmin(req) || row.seller_id===req.user?.id}));
  }
  if(n==='PhoneUser'||n==='User'){
    if(id!==req.user.id && !isAdmin(req)) return res.status(403).json({error:'Forbidden'});
    const row=(await db.query(`SELECT * FROM users WHERE id=$1`,[id])).rows[0];
    if(!row) return res.status(404).json({error:'Not found'});
    return res.json(publicEntity(n,row));
  }
  if(n==='DetailRequest'){
    const q=await db.query(`SELECT dr.*,bu.phone buyer_phone,su.email seller_email,l.title listing_title,l.seller_id FROM detail_requests dr JOIN users bu ON bu.id=dr.buyer_id JOIN listings l ON l.id=dr.listing_id JOIN users su ON su.id=l.seller_id WHERE dr.id=$1`,[id]);
    const row=q.rows[0]; if(!row) return res.status(404).json({error:'Not found'});
    if(!isAdmin(req) && req.user.id!==row.buyer_id && req.user.id!==row.seller_id) return res.status(403).json({error:'Forbidden'});
    if(!isAdmin(req) && row.payment_status!=='paid') return res.json(publicEntity(n,row));
    return res.json(publicEntity(n,row));
  }
  const r=await db.query(`SELECT id,data,created_at,updated_at FROM entity_records WHERE entity_name=$1 AND id=$2`,[n,id]);
  if(!r.rows[0]) return res.status(404).json({error:'Not found'});
  if(!isAdmin(req)){
    const d=r.rows[0].data||{};
    const owner = (await db.query('SELECT phone,email FROM users WHERE id=$1',[req.user.id])).rows[0];
    const identities=[owner?.phone,owner?.email,req.user.id].filter(Boolean).map(String);
    const owned=[d.user_email,d.buyer_email,d.seller_email,d.recipient_email,d.user_id].filter(Boolean).some((value) => identities.includes(String(value)));
    if(!owned) return res.status(403).json({error:'Forbidden'});
  }
  res.json({id:r.rows[0].id,created_date:r.rows[0].created_at,...r.rows[0].data});
 }catch(e){next(e)}
});

app.post('/api/entities/:entity', auth(), async(req,res,next)=>{
 try{
  const n=req.params.entity,d=req.body||{};
  if(n==='BusinessListing'){
    if(!['seller','admin'].includes(req.user.role)) return res.status(403).json({error:'Only sellers can create listings'});
    if(!d.title || !d.category || !d.county || !d.town || !d.description) return res.status(400).json({error:'Required listing information is missing.'});
    if(!Array.isArray(d.photos) || d.photos.length<1) return res.status(400).json({error:'At least one business photo is required.'});
    if(!Array.isArray(d.videos) || d.videos.length<1) return res.status(400).json({error:'A business video is required.'});
    for (const field of ['business_licence','registration_cert','owner_id_docs']) if(!Array.isArray(d[field]) || d[field].length<1) return res.status(400).json({error:'All confidential verification documents are required.'});
    const metadata=Object.fromEntries(Object.entries(d).filter(([k])=>!['title','description','price','status'].includes(k)));
    const requestedStatus = req.user.role==='admin' ? (d.status || 'pending') : 'pending';
    const safeStatus = ['draft','pending','approved','active','sold','rejected','archived'].includes(requestedStatus) ? requestedStatus : 'pending';
    const adminBypass = req.user.role === 'admin';
    const listingFees = { basic: 2000, featured: 3000, premium: 4000 };
    const listingFee = listingFees[d.listing_type] || 2000;
    const r=await db.query(`INSERT INTO listings(seller_id,title,description,price,status,metadata,payment_status,payment_amount) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[req.user.id,d.title,d.description,Number(d.price)||0,safeStatus,JSON.stringify(metadata),adminBypass?'paid':'unpaid',adminBypass?0:listingFee]);
    return res.status(201).json(publicEntity(n,r.rows[0],{includePrivate:true}));
  }
  if(n==='DetailRequest') return res.status(405).json({error:'Use the request payment flow to create a detail request.'});
  if(n==='Report') {
    if (req.user.role !== 'admin' && String(d.reporter_email || '') !== String(req.user.phone || req.user.email || req.user.id)) return res.status(403).json({error:'Forbidden'});
    let reportedUserEmail = '';
    if (d.listing_id) {
      const owner = (await db.query('SELECT u.email FROM listings l JOIN users u ON u.id=l.seller_id WHERE l.id=$1',[d.listing_id])).rows[0];
      reportedUserEmail = owner?.email || '';
    }
    const reportData = {...d, reported_user_email: reportedUserEmail, reporter_email: req.user.phone || req.user.email || req.user.id};
    const r=await db.query(`INSERT INTO entity_records(entity_name,data) VALUES('Report',$1) RETURNING id,data,created_at,updated_at`,[JSON.stringify(reportData)]);
    return res.status(201).json({id:r.rows[0].id,created_date:r.rows[0].created_at,...reportData});
  }
  if(!isAdmin(req) && ['Transaction','Report','SupportRequest','Notification','Conversation'].includes(n)) {
    // Allow only records tied to the authenticated user; callers cannot forge ownership fields.
    const ownerFields=['user_email','buyer_email','seller_email','recipient_email','sender_email','reporter_email','user_id'];
    const owns=ownerFields.some(k=>d[k] && String(d[k])===(req.user.phone||req.user.id));
    if(!owns) return res.status(403).json({error:'Forbidden'});
  }
  const r=await db.query(`INSERT INTO entity_records(entity_name,data) VALUES($1,$2) RETURNING id,data,created_at,updated_at`,[n,JSON.stringify(d)]);
  res.status(201).json({id:r.rows[0].id,created_date:r.rows[0].created_at,...d});
 }catch(e){next(e)}
});

app.patch('/api/entities/:entity/:id', auth(), async(req,res,next)=>{
 try{
  const n=req.params.entity,id=req.params.id,d=req.body||{};
  if(n==='BusinessListing') {
    const existing=(await db.query(`SELECT * FROM listings WHERE id=$1`,[id])).rows[0];
    if(!existing) return res.status(404).json({error:'Not found'});
    if(req.user.role!=='admin' && existing.seller_id!==req.user.id) return res.status(403).json({error:'Forbidden'});
    if(req.user.role!=='admin' && d.status!==undefined) return res.status(403).json({error:'Only the admin team can change listing approval status.'});
    const metadata={...d}; for(const k of ['title','description','price','status']) delete metadata[k];
    const r=await db.query(`UPDATE listings SET title=COALESCE($2,title),description=COALESCE($3,description),price=COALESCE($4,price),status=COALESCE($5,status),metadata=metadata || COALESCE($6,'{}'::jsonb),updated_at=NOW() WHERE id=$1 RETURNING *`,[id,d.title,d.description,d.price,d.status,JSON.stringify(metadata)]);
    return res.json(publicEntity(n,r.rows[0],{includePrivate:true}));
  }
  if(n==='PhoneUser'||n==='User') {
    if(id!==req.user.id && !isAdmin(req)) return res.status(403).json({error:'Forbidden'});
    const current=(await db.query('SELECT * FROM users WHERE id=$1',[id])).rows[0]; if(!current) return res.status(404).json({error:'Not found'});
    if(d.full_name!==undefined || d.name!==undefined){ if(current.name_locked && !isAdmin(req)) return res.status(403).json({error:'Your verified name cannot be changed.'}); }
    const map={full_name:'name',phone_number:'phone'}; const sets=[],vals=[id];
    const allowed=['name','bio','gender','county','subcounty','profile_picture','national_id','selfie_url','id_document_url','favorites','business_docs'];
    if (isAdmin(req)) allowed.push('phone');
    if (isAdmin(req)) allowed.push('verification_status','name_locked','verified_at');
    for(const [k,v] of Object.entries(d)){const col=map[k]||k;if(allowed.includes(col)){sets.push(`${col}=$${vals.length+1}`);vals.push(typeof v==='object'?JSON.stringify(v):v)}}
    if(!sets.length)return res.json(publicEntity(n,current));
    const r=await db.query(`UPDATE users SET ${sets.join(',')} WHERE id=$1 RETURNING *`,vals);return res.json(publicEntity(n,r.rows[0]));
  }
  if(n==='DetailRequest'){
    if(!isAdmin(req)) return res.status(403).json({error:'Only the admin team can update buyer requests.'});
    const allowed=['status','rejection_reason','seller_response','admin_response','response_history','responded_at']; const sets=[],vals=[id];
    for(const k of allowed) if(d[k]!==undefined){sets.push(`${k}=$${vals.length+1}`);vals.push(d[k]);}
    if(!sets.length) return res.status(400).json({error:'No supported fields to update.'});
    sets.push(`updated_at=NOW()`);
    const r=await db.query(`UPDATE detail_requests SET ${sets.join(',')} WHERE id=$1 RETURNING *`,vals); if(!r.rows[0]) return res.status(404).json({error:'Not found'});
    const full=(await db.query(`SELECT dr.*,bu.phone buyer_phone,su.email seller_email,l.title listing_title FROM detail_requests dr JOIN users bu ON bu.id=dr.buyer_id JOIN listings l ON l.id=dr.listing_id JOIN users su ON su.id=l.seller_id WHERE dr.id=$1`,[id])).rows[0];
    return res.json(publicEntity(n,full));
  }
  if(!isAdmin(req)){
    const old=await db.query(`SELECT data FROM entity_records WHERE entity_name=$1 AND id=$2`,[n,id]); if(!old.rows[0])return res.status(404).json({error:'Not found'});
    const data=old.rows[0].data||{};
    const owner=(await db.query('SELECT phone,email FROM users WHERE id=$1',[req.user.id])).rows[0];
    const identities=[owner?.phone,owner?.email,req.user.id].filter(Boolean).map(String);
    if(![data.user_email,data.buyer_email,data.seller_email,data.recipient_email,data.user_id].filter(Boolean).some((value) => identities.includes(String(value)))) return res.status(403).json({error:'Forbidden'});
  }
  const old=await db.query(`SELECT data FROM entity_records WHERE entity_name=$1 AND id=$2`,[n,id]); if(!old.rows[0])return res.status(404).json({error:'Not found'}); const merged={...old.rows[0].data,...d}; const r=await db.query(`UPDATE entity_records SET data=$3,updated_at=NOW() WHERE entity_name=$1 AND id=$2 RETURNING *`,[n,id,JSON.stringify(merged)]);res.json({id,...merged});
 }catch(e){next(e)}
});

app.post('/api/admin/listings/:id/mark-sold', auth(['admin']), async (req, res, next) => {
  try {
    const id = req.params.id;
    const soldPriceRaw = req.body?.sold_price;
    const soldPrice = soldPriceRaw === undefined || soldPriceRaw === null || soldPriceRaw === ''
      ? null
      : Number(soldPriceRaw);
    if (soldPrice !== null && (!Number.isFinite(soldPrice) || soldPrice < 0)) {
      return res.status(400).json({ error: 'Enter a valid sold price or leave it blank.' });
    }
    const existing = (await db.query('SELECT * FROM listings WHERE id=$1', [id])).rows[0];
    if (!existing) return res.status(404).json({ error: 'Listing not found.' });
    if (existing.status === 'sold') {
      return res.json({ success: true, alreadySold: true, listing: publicEntity('BusinessListing', existing, { includePrivate: true }) });
    }
    if (!['approved','active'].includes(existing.status)) {
      return res.status(400).json({ error: 'Only an approved or active listing can be marked as sold.' });
    }
    const updated = (await db.query(
      `UPDATE listings
       SET status='sold',
           metadata = metadata || jsonb_build_object('sold_at', NOW()::text, 'sold_price', $2::numeric),
           updated_at=NOW()
       WHERE id=$1
       RETURNING *`,
      [id, soldPrice]
    )).rows[0];
    return res.json({ success: true, listing: publicEntity('BusinessListing', updated, { includePrivate: true }) });
  } catch (e) { next(e); }
});

app.post('/api/admin/listings/:id/restore', auth(['admin']), async (req, res, next) => {
  try {
    const id = req.params.id;
    const existing = (await db.query('SELECT * FROM listings WHERE id=$1', [id])).rows[0];
    if (!existing) return res.status(404).json({ error: 'Listing not found.' });
    const nextStatus = existing.payment_status === 'paid' ? 'approved' : 'draft';
    const metadata = { ...(existing.metadata || {}) };
    delete metadata.sold_at;
    delete metadata.sold_price;
    const updated = (await db.query(
      `UPDATE listings SET status=$2, metadata=$3::jsonb, updated_at=NOW() WHERE id=$1 RETURNING *`,
      [id, nextStatus, JSON.stringify(metadata)]
    )).rows[0];
    return res.json({ success: true, listing: publicEntity('BusinessListing', updated, { includePrivate: true }) });
  } catch (e) { next(e); }
});

app.delete('/api/entities/:entity/:id', auth(), async(req,res,next)=>{try{const n=req.params.entity,id=req.params.id;if(n==='BusinessListing'){const existing=(await db.query('SELECT seller_id FROM listings WHERE id=$1',[id])).rows[0];if(!existing)return res.status(404).end();if(req.user.role!=='admin'&&existing.seller_id!==req.user.id)return res.status(403).json({error:'Forbidden'});await db.query('DELETE FROM listings WHERE id=$1',[id]);return res.status(204).end()} if(!isAdmin(req))return res.status(403).json({error:'Forbidden'}); await db.query('DELETE FROM entity_records WHERE entity_name=$1 AND id=$2',[n,id]);res.status(204).end()}catch(e){next(e)}});

/* =====================================================
   FUNCTION MIGRATION ENDPOINTS
===================================================== */
app.post('/api/listings/:id/payment', auth(['seller','admin']), async (req, res, next) => {
  try {
    const listing = (await db.query(`SELECT l.*,u.phone AS seller_phone FROM listings l JOIN users u ON u.id=l.seller_id WHERE l.id=$1`, [req.params.id])).rows[0];
    if (!listing) return res.status(404).json({ error:'Listing not found.' });
    if (req.user.role !== 'admin' && listing.seller_id !== req.user.id) return res.status(403).json({ error:'Forbidden' });
    if (req.user.role === 'admin') {
      const updated=(await db.query(`UPDATE listings SET payment_status='paid',payment_amount=0,status=CASE WHEN status='draft' THEN 'pending' ELSE status END,updated_at=NOW() WHERE id=$1 RETURNING *`,[listing.id])).rows[0];
      return res.json({success:true,payment_status:'paid',amount:0,bypassed:true,listing:publicEntity('BusinessListing',updated,{includePrivate:true}),message:'Administrator listing fee waived.'});
    }
    if (listing.payment_status === 'paid') return res.json({success:true,payment_status:'paid',amount:0,message:'This listing has already been paid for.'});
    const listingType=listing.metadata?.listing_type || 'basic';
    const listingFees={basic:2000,featured:3000,premium:4000};
    const amount=listingFees[listingType] || 2000;
    const phone=normalizePhone(req.body?.phone || listing.seller_phone);
    if (!isKenyanPhone(phone)) return res.status(400).json({error:'Enter a valid Kenyan M-Pesa phone number.'});
    const {token:accessToken,cfg}=await mpesaAccessToken();
    const timestamp=new Date().toISOString().replace(/[-:TZ.]/g,'').slice(0,14);
    const password=mpesaPassword(cfg.shortcode,cfg.passkey,timestamp);
    const response=await fetch(`${cfg.baseUrl}/mpesa/stkpush/v1/processrequest`,{method:'POST',headers:{Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'},body:JSON.stringify({BusinessShortCode:cfg.shortcode,Password:password,Timestamp:timestamp,TransactionType:cfg.transactionType,Amount:amount,PartyA:phone.slice(1),PartyB:cfg.partyB,PhoneNumber:phone.slice(1),CallBackURL:cfg.callbackUrl,AccountReference:String(listing.id).slice(0,12),TransactionDesc:'Latielle listing'})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok||data.ResponseCode!=='0'){
      await db.query(`UPDATE listings SET payment_status='failed',payment_amount=$2,updated_at=NOW() WHERE id=$1`,[listing.id,amount]);
      return res.status(502).json({success:false,payment_status:'failed',amount,error:'The M-Pesa payment prompt could not be started. Your listing is saved. You can return and try the payment again.'});
    }
    await db.query(`UPDATE listings SET payment_status='pending',payment_amount=$2,checkout_request_id=$3,metadata=jsonb_set(COALESCE(metadata,'{}'::jsonb),'{'payment_phone'}',to_jsonb($4::text),true),updated_at=NOW() WHERE id=$1`,[listing.id,amount,data.CheckoutRequestID,phone]);
    return res.json({success:true,payment_status:'pending',amount,checkoutRequestId:data.CheckoutRequestID,message:`M-Pesa prompt sent for KES ${amount.toLocaleString()}. Your listing is saved while payment is completed.`});
  } catch(e){next(e);}
});

app.post('/api/functions/:name', optionalAuth, sensitiveRateLimit, async(req,res,next)=>{
 try{const n=req.params.name,p=req.body||{};
  if(n==='loginWithPin') return res.redirect(307, '/api/auth/login-pin');
  if(n==='setPin') {
    const pin=String(p.pin||'');
    if(!/^\d{4}$/.test(pin)) return res.status(400).json({error:'PIN must be exactly 4 digits'});
    const userId=p.userId || req.user?.id;
    if(!userId || !req.user) return res.status(401).json({error:'Authentication required'});
    if(userId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({error:'Forbidden'});
    const hash=await bcrypt.hash(pin,12);
    const r=await db.query('UPDATE users SET pin_hash=$2,has_pin=true WHERE id=$1 RETURNING *',[userId,hash]);
    if(!r.rows[0]) return res.status(404).json({error:'User not found'});
    return res.json({success:true,user:phoneUser(r.rows[0])});
  }
  if(n==='submitDetailRequest') {
    if (!req.user || !['buyer','admin'].includes(req.user.role)) return res.status(401).json({error:'Buyer authentication is required.'});
    const listingId = p.listingId || p.listing_id;
    if (!listingId) return res.status(400).json({error:'listingId is required.'});
    const listing = (await db.query(`SELECT l.*,u.email seller_email,u.phone seller_phone FROM listings l JOIN users u ON u.id=l.seller_id WHERE l.id=$1 AND l.status IN ('approved','active')`,[listingId])).rows[0];
    if (!listing) return res.status(404).json({error:'This business is no longer available.'});
    const existing = (await db.query(`SELECT * FROM detail_requests WHERE listing_id=$1 AND buyer_id=$2 AND payment_status='paid' AND status NOT IN ('rejected') ORDER BY created_at DESC LIMIT 1`,[listingId,req.user.id])).rows[0];
    if (existing) return res.json({success:true,already_exists:true,request:existing,payment_status:'paid'});

    const pending = (await db.query(`SELECT * FROM detail_requests WHERE listing_id=$1 AND buyer_id=$2 AND payment_status IN ('unpaid','pending','failed') ORDER BY created_at DESC LIMIT 1`,[listingId,req.user.id])).rows[0];
    const request = pending || (await db.query(`INSERT INTO detail_requests(listing_id,buyer_id,message,status,payment_status,amount_paid) VALUES($1,$2,$3,'pending_payment','pending',0) RETURNING *`,[listingId,req.user.id,String(p.message||'').slice(0,4000)])).rows[0];

    if (request.payment_status === 'failed') await db.query(`UPDATE detail_requests SET payment_status='pending',status='pending_payment',rejection_reason=NULL,updated_at=NOW() WHERE id=$1`,[request.id]);
    const phoneRow=(await db.query('SELECT phone FROM users WHERE id=$1',[req.user.id])).rows[0];
    const phone=normalizePhone(p.phone || phoneRow?.phone);
    if(!isKenyanPhone(phone)) return res.status(400).json({error:'Add a valid Kenyan M-Pesa phone number to your profile before paying.'});

    const {token: accessToken,cfg}=await mpesaAccessToken();
    const timestamp=new Date().toISOString().replace(/[-:TZ.]/g,'').slice(0,14);
    const password=mpesaPassword(cfg.shortcode,cfg.passkey,timestamp);
    const response=await fetch(`${cfg.baseUrl}/mpesa/stkpush/v1/processrequest`,{method:'POST',headers:{Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'},body:JSON.stringify({BusinessShortCode:cfg.shortcode,Password:password,Timestamp:timestamp,TransactionType:cfg.transactionType,Amount:DETAIL_REQUEST_FEE,PartyA:phone.slice(1),PartyB:cfg.partyB,PhoneNumber:phone.slice(1),CallBackURL:cfg.callbackUrl,AccountReference:String(request.id).slice(0,12),TransactionDesc:'Latielle details'})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok||data.ResponseCode!=='0') return res.status(502).json({success:false,request_id:request.id,payment_status:'pending',error:data.errorMessage||data.ResponseDescription||'M-Pesa payment request failed. Your request remains saved as awaiting payment.'});
    await db.query(`UPDATE detail_requests SET checkout_request_id=$2,payment_status='pending',status='pending_payment',updated_at=NOW() WHERE id=$1`,[request.id,data.CheckoutRequestID]);
    await db.query(`INSERT INTO entity_records(entity_name,data) VALUES('Transaction',$1)`,[JSON.stringify({user_email:req.user.phone||req.user.id,phone_number:phone,amount:DETAIL_REQUEST_FEE,service_type:'detail_request',reference_id:request.id,status:'pending',checkout_request_id:data.CheckoutRequestID,description:'M-Pesa payment for confidential business details'})]);
    return res.json({success:true,request_id:request.id,checkoutRequestId:data.CheckoutRequestID,amount:DETAIL_REQUEST_FEE,payment_status:'pending',message:`M-Pesa prompt sent for KES ${DETAIL_REQUEST_FEE.toLocaleString()}. The request will be sent to the admin team only after payment is confirmed.`});
  }
  if(n==='mpesaStkPush') {
    if (!req.user || !['seller','admin'].includes(req.user.role)) return res.status(401).json({error:'Authentication required.'});
    const phone=normalizePhone(p.phone);
    let amount=Number(p.amount||0);
    let referenceId=String(p.listingId||p.detailRequestId||'LATIELLE');
    if (p.listingId || p.detailRequestId) {
      const listing=(await db.query('SELECT id,seller_id,metadata,payment_status FROM listings WHERE id=$1',[referenceId])).rows[0];
      if (listing) {
        if (listing.seller_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({error:'Forbidden'});
        if (req.user.role === 'admin') return res.json({success:true,payment_status:'paid',amount:0,bypassed:true,message:'Administrator listing fee waived.'});
        const listingType=listing.metadata?.listing_type || 'basic';
        const listingFees={basic:2000,featured:3000,premium:4000};
        amount=listingFees[listingType] || 2000;
      }
    }
    if(!isKenyanPhone(phone) || !Number.isFinite(amount) || amount<=0) return res.status(400).json({error:'Valid phone number and amount are required'});
    const {token: accessToken,cfg}=await mpesaAccessToken(); const timestamp=new Date().toISOString().replace(/[-:TZ.]/g,'').slice(0,14); const password=mpesaPassword(cfg.shortcode,cfg.passkey,timestamp);
    const response=await fetch(`${cfg.baseUrl}/mpesa/stkpush/v1/processrequest`,{method:'POST',headers:{Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'},body:JSON.stringify({BusinessShortCode:cfg.shortcode,Password:password,Timestamp:timestamp,TransactionType:cfg.transactionType,Amount:Math.round(amount),PartyA:phone.slice(1),PartyB:cfg.partyB,PhoneNumber:phone.slice(1),CallBackURL:cfg.callbackUrl,AccountReference:referenceId.slice(0,12),TransactionDesc:String(p.listingTitle||'Latielle payment').slice(0,13)})});
    const data=await response.json().catch(()=>({})); if(!response.ok||data.ResponseCode!=='0') return res.status(502).json({error:data.errorMessage||data.ResponseDescription||'M-Pesa payment request failed'});
    if (p.listingId || p.detailRequestId) {
      await db.query(`UPDATE listings SET payment_status='pending',payment_amount=$2,checkout_request_id=$3,updated_at=NOW() WHERE id=$1`,[referenceId,amount,data.CheckoutRequestID]);
    }
    return res.json({success:true,checkoutRequestId:data.CheckoutRequestID,merchantRequestId:data.MerchantRequestID,message:'M-Pesa payment prompt sent'});
  }
  if(n==='notifyAdminSupportRequest') {
    try {
      const emailSent = await sendSupportEmail({
        name: p.user_name,
        email: p.user_email,
        message: p.message,
        conversation: p.conversation,
      });
      return res.json({success:true, emailSent});
    } catch (emailError) {
      console.error(emailError);
      return res.status(502).json({success:false, emailSent:false, error:'Support notification could not be sent.'});
    }
  }
  if(n==='createNotification'||n==='notifyAdminSupportRequest'||n==='notifyBuyerResponse'||n==='notifySellerOnRequest'||n==='notifyBuyers') return res.json({success:true});
  if(n==='checkPaymentStatus') return res.json({success:true,status:'pending'});
  return res.status(404).json({error:`Unknown function: ${n}`});
 }catch(e){next(e)}
});

/* =====================================================
   SUPPORT / AI / EMAIL
===================================================== */
app.post('/api/support/human-request', optionalAuth, sensitiveRateLimit, async (req, res, next) => {
  try {
    const name = String(req.body?.name || req.user?.name || '').trim().slice(0, 120);
    const email = String(req.body?.email || req.user?.email || '').trim().toLowerCase();
    const message = String(req.body?.message || '').trim().slice(0, 4000);
    const conversation = Array.isArray(req.body?.conversation) ? req.body.conversation.slice(-20) : [];

    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({error:'Enter a valid email address.'});
    if (!message) return res.status(400).json({error:'Tell us briefly what you need help with.'});

    const record = {
      user_email: email,
      user_name: name || email,
      message,
      conversation_summary: conversation.map((item) => `${item.role}: ${String(item.content || '')}`).join('\n').slice(0, 12000),
      type: 'human_request',
      status: 'open',
    };
    const saved = await db.query('INSERT INTO entity_records(entity_name,data) VALUES($1,$2) RETURNING id,created_at', ['SupportRequest', JSON.stringify(record)]);

    let emailSent = false;
    try {
      emailSent = await sendSupportEmail({ name, email, message, conversation });
    } catch (emailError) {
      console.error('Support notification failed', emailError);
    }

    res.json({ success:true, requestId:saved.rows[0]?.id, emailSent });
  } catch (error) {
    next(error);
  }
});

app.post('/api/email', auth(), sensitiveRateLimit, async (req,res,next)=>{
  try {
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return res.status(503).json({success:false,error:'Email service is not configured.'});
    const payload = req.body || {};
    const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
    if (!recipients.length || recipients.some((address) => String(address || '').toLowerCase() !== SUPPORT_EMAIL.toLowerCase())) {
      return res.status(403).json({success:false,error:'This email endpoint is restricted to LATIELLE support notifications.'});
    }
    const response = await fetch('https://api.resend.com/emails',{
      method:'POST',
      headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({from:process.env.RESEND_FROM_EMAIL,to:[SUPPORT_EMAIL],subject:String(payload.subject || 'LATIELLE MARKET HUB').slice(0,160),text:String(payload.body || '').slice(0,12000)}),
    });
    const data = await response.json().catch(()=>({}));
    if(!response.ok) return res.status(502).json({success:false,error:data.message || 'Email service rejected the message.'});
    res.json({success:true,queued:true,id:data.id || null});
  }catch(e){next(e)}
});

app.post('/api/ai', optionalAuth, async (req,res,next)=>{
  try {
    const key = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    if (!allowAiRequest(String(key))) return res.status(429).json({error:'Too many chat requests. Please wait a moment and try again.'});
    if (!process.env.OPENAI_API_KEY) return res.status(503).json({error:'LATIELLE support is temporarily unavailable.'});

    const input = Array.isArray(req.body?.input)
      ? req.body.input.slice(-12).map((item) => ({ role:item.role === 'assistant' ? 'assistant' : 'user', content:String(item.content || '').slice(0, 3000) }))
      : String(req.body?.prompt || '').slice(0, 10000);

    const callModel = async (model) => fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({model,instructions:OPENAI_INSTRUCTIONS,input,store:false,max_output_tokens:700}),
      signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS),
    });

    let response = await callModel(OPENAI_MODEL);
    // If the configured model is unavailable for this account, retry once with a broadly available fallback.
    if (!response.ok && [400,404].includes(response.status) && OPENAI_FALLBACK_MODEL && OPENAI_FALLBACK_MODEL !== OPENAI_MODEL) {
      const firstError = await response.clone().json().catch(()=>({}));
      console.warn('Primary OpenAI model unavailable; trying fallback model.', {model:OPENAI_MODEL,status:response.status,error:firstError?.error?.message});
      response = await callModel(OPENAI_FALLBACK_MODEL);
    }
    const data = await response.json().catch(()=>({}));
    if(!response.ok) {
      console.error('OpenAI request failed', {status:response.status,error:data?.error?.message});
      return res.status(502).json({error:'LATIELLE support is temporarily unavailable.'});
    }
    const answer = data.output_text || data.output?.flatMap((item)=>item.content||[]).filter((item)=>item.type==='output_text').map((item)=>item.text).join('\n') || '';
    if(!answer) return res.status(502).json({error:'LATIELLE support did not return an answer.'});
    res.json({success:true,answer});
  }catch(e){
    if (e?.name === 'TimeoutError' || e?.name === 'AbortError') return res.status(504).json({error:'LATIELLE support took too long to respond. Please try again.'});
    next(e);
  }
});

app.post('/api/auth/forgot-password', async (_req,res)=>res.json({success:true,message:'Password reset is not used for phone/PIN accounts.'}));
app.post('/api/auth/reset-password', async (_req,res)=>res.status(400).json({error:'Password reset is not available for phone/PIN accounts.'}));

// Serve the production React build from the same Express process on Render.
// Keep the document itself out of caches so a stale PWA shell cannot leave the
// browser on a blank screen after a deployment. Fingerprinted Vite assets can
// still be cached normally.
const distPath = path.join(__dirname, '..', 'dist');
const distIndex = path.join(distPath, 'index.html');
app.use('/assets', express.static(path.join(distPath, 'assets'), {
  immutable: true,
  maxAge: '1y',
}));
app.get('/favicon.svg', (req, res) => res.sendFile(path.join(distPath, 'favicon.svg')));
app.get('/site.webmanifest', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.sendFile(path.join(distPath, 'site.webmanifest'));
});
app.get('/sw.js', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Service-Worker-Allowed', '/');
  res.sendFile(path.join(distPath, 'sw.js'));
});
app.use(express.static(distPath, {
  index: false,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-store, max-age=0');
  },
}));
app.get('/', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.sendFile(distIndex, (error) => error && next(error));
});
app.get('/{*splat}', (req,res,next) => {
  if (req.path.startsWith('/api/')) return next();
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.sendFile(distIndex, (error) => error && next(error));
});

/* =====================================================
   FINAL ERROR HANDLER
===================================================== */
app.use((error, req, res, _next) => {
  console.error('Unhandled API error', {
    method: req.method,
    path: req.originalUrl,
    message: error?.message,
    stack: error?.stack,
  });
  if (res.headersSent) return;
  res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Something went wrong. Please try again.' : (error?.message || 'Internal server error') });
});

async function startServer() {
  // Bind the HTTP port first so Render can reach the frontend even if the
  // database is temporarily unavailable during a deploy/restart.
  app.listen(PORT, () => console.log(`Latielle Market Hub listening on ${PORT}`));

  const fs = require('fs');
  const schemaPath = path.join(__dirname, '..', 'data', 'schema.sql');
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not configured. The website is running, but database features are unavailable.');
    return;
  }

  try {
    if (fs.existsSync(schemaPath)) {
      await db.query(fs.readFileSync(schemaPath, 'utf8'));
      console.log('Database schema verified.');
    }
  } catch (error) {
    // Do not take the whole website offline because a migration/DB connection
    // is temporarily failing. API calls will surface an appropriate error.
    console.error('Database initialization failed:', error?.message || error);
  }
}

startServer();
