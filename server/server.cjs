require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('./db.cjs');

const app = express();

const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

app.use(
  cors({
    origin: process.env.CLIENT_URL
      ? process.env.CLIENT_URL.split(',')
      : true,
  })
);

app.use(express.json({ limit: '2mb' }));

function token(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
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

/* =====================================================
   HEALTH CHECK
===================================================== */

app.get('/api/health', async (_req, res) => {
  try {
    await db.query('SELECT 1');

    res.json({
      ok: true,
      database: true,
    });
  } catch (error) {
    res.status(503).json({
      ok: false,
      database: false,
      error: error.message,
    });
  }
});

/* =====================================================
   AUTHENTICATION
===================================================== */

app.post('/api/auth/register', async (req, res, next) => {
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

app.post('/api/auth/login', async (req, res, next) => {
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
      WHERE (
        $1::text IS NULL
        OR l.status = $1
      )
      ORDER BY l.created_at DESC
      `,
      [
        req.query.status || 'active',
      ]
    );

    res.json(result.rows);
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

    if (!result.rows[0]) {
      return res.status(404).json({
        error: 'Listing not found',
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.post(
  '/api/listings',
  auth(['seller', 'admin']),
  async (req, res, next) => {
    try {
      const {
        title,
        description = '',
        price,
      } = req.body;

      if (!title || price === undefined) {
        return res.status(400).json({
          error: 'Title and price are required',
        });
      }

      const result = await db.query(
        `
        INSERT INTO listings (
          seller_id,
          title,
          description,
          price
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *
        `,
        [
          req.user.id,
          title,
          description,
          price,
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      next(error);
    }
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

      const {
        title,
        description,
        price,
        status,
      } = req.body;

      const result = await db.query(
        `
        UPDATE listings
        SET
          title = COALESCE($2, title),
          description = COALESCE($3, description),
          price = COALESCE($4, price),
          status = COALESCE($5, status),
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
        `,
        [
          req.params.id,
          title,
          description,
          price,
          status,
        ]
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
   SERVE REACT FRONTEND
===================================================== */

app.use(
  express.static(
    path.join(__dirname, '..', 'dist')
  )
);

app.get(
  /^(?!\/api).*/,
  (_req, res) => {
    res.sendFile(
      path.join(
        __dirname,
        '..',
        'dist',
        'index.html'
      )
    );
  }
);

/* =====================================================
   ERROR HANDLER
===================================================== */

app.use((error, _req, res, _next) => {
  console.error(error);

  res.status(500).json({
    error: 'Internal server error',
  });
});

/* =====================================================
   START SERVER
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
  };
}

async function mpesaAccessToken() {
  const cfg = mpesaConfig();
  const credentials = Buffer.from(`${cfg.consumerKey}:${cfg.consumerSecret}`).toString('base64');
  const response = await fetch(`${cfg.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) throw new Error(data.errorMessage || 'Unable to authenticate with M-Pesa');
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
  };
}

app.post('/api/auth/register-payment', async (req, res, next) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const role = ['buyer', 'seller'].includes(req.body.role) ? req.body.role : 'buyer';
    const pin = String(req.body.pin || '');
    if (!isKenyanPhone(phone)) return res.status(400).json({ error: 'Enter a valid Kenyan mobile number.' });
    if (!/^\d{4}$/.test(pin)) return res.status(400).json({ error: 'PIN must be exactly 4 digits.' });

    const existing = await db.query('SELECT id, phone_verified FROM users WHERE phone=$1', [phone]);
    if (existing.rows[0]) {
      return res.status(409).json({ error: existing.rows[0].phone_verified ? 'This phone number is already registered. Sign in with your PIN.' : 'This phone number already has a registration in progress.' });
    }

    const pinHash = await bcrypt.hash(pin, 12);
    await db.query(`
      INSERT INTO pending_registrations(phone, role, pin_hash, amount, status, updated_at)
      VALUES($1,$2,$3,100,'pending',NOW())
      ON CONFLICT(phone) DO UPDATE SET role=EXCLUDED.role, pin_hash=EXCLUDED.pin_hash, amount=100, status='pending', merchant_request_id=NULL, checkout_request_id=NULL, mpesa_receipt=NULL, result_code=NULL, updated_at=NOW()
    `, [phone, role, pinHash]);

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
        TransactionType: process.env.MPESA_TRANSACTION_TYPE || 'CustomerPayBillOnline',
        Amount: 100,
        PartyA: phone.slice(1),
        PartyB: cfg.partyB,
        PhoneNumber: phone.slice(1),
        CallBackURL: cfg.callbackUrl,
        AccountReference: 'LATIELLE',
        TransactionDesc: 'Account Verify',
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ResponseCode !== '0') {
      return res.status(502).json({ error: data.errorMessage || data.ResponseDescription || 'M-Pesa payment request failed.' });
    }

    await db.query(`UPDATE pending_registrations SET merchant_request_id=$2, checkout_request_id=$3, updated_at=NOW() WHERE phone=$1`, [phone, data.MerchantRequestID || null, data.CheckoutRequestID || null]);

    res.json({ success: true, checkoutRequestId: data.CheckoutRequestID, message: 'M-Pesa payment prompt sent. Approve KSh 100 on your phone.' });
  } catch (e) { next(e); }
});

app.get('/api/auth/registration-status/:checkoutRequestId', async (req, res, next) => {
  try {
    const checkoutId = String(req.params.checkoutRequestId || '');
    const r = await db.query('SELECT * FROM pending_registrations WHERE checkout_request_id=$1', [checkoutId]);
    const pending = r.rows[0];
    if (!pending) return res.status(404).json({ error: 'Registration payment not found.' });
    if (pending.status === 'paid') {
      const u = (await db.query('SELECT * FROM users WHERE phone=$1', [pending.phone])).rows[0];
      if (u) return res.json({ success: true, status: 'paid', user: phoneUser(u), token: token({ id: u.id, email: u.email, role: u.role }) });
    }
    res.json({ success: true, status: pending.status });
  } catch (e) { next(e); }
});

app.post('/api/payments/mpesa/callback', async (req, res, next) => {
  try {
    await db.query(`INSERT INTO payment_events(provider,payload) VALUES($1,$2)`, ['mpesa', JSON.stringify(req.body)]);
    const stk = req.body?.Body?.stkCallback;
    const checkoutId = stk?.CheckoutRequestID;
    const resultCode = Number(stk?.ResultCode);
    if (checkoutId) {
      const pending = (await db.query('SELECT * FROM pending_registrations WHERE checkout_request_id=$1', [checkoutId])).rows[0];
      if (pending) {
        if (resultCode === 0) {
          const items = stk.CallbackMetadata?.Item || [];
          const getItem = (name) => items.find((item) => item.Name === name)?.Value;
          const amount = Number(getItem('Amount') || 0);
          const receipt = getItem('MpesaReceiptNumber') || null;
          const phone = normalizePhone(getItem('PhoneNumber') ? String(getItem('PhoneNumber')) : pending.phone);
          if (amount !== 100 || phone !== pending.phone) {
            await db.query(`UPDATE pending_registrations SET status='failed', result_code=$2, updated_at=NOW() WHERE id=$1`, [pending.id, 1]);
          } else {
            const client = await db.pool?.connect?.();
            // db.cjs exposes query only; use a transaction through its pool when available.
            if (client) {
              try {
                await client.query('BEGIN');
                const existing = await client.query('SELECT * FROM users WHERE phone=$1 FOR UPDATE', [pending.phone]);
                let u = existing.rows[0];
                if (!u) {
                  u = (await client.query(`INSERT INTO users(name,email,password_hash,role,phone,phone_verified,pin_hash,has_pin,verification_status) VALUES('',$1,$2,$3,$4,true,$5,true,'verified') RETURNING *`, [`phone+${pending.phone}@latielle.local`, await bcrypt.hash(crypto.randomUUID(), 8), pending.role, pending.phone, pending.pin_hash])).rows[0];
                }
                await client.query(`UPDATE pending_registrations SET status='paid', mpesa_receipt=$2, result_code=0, updated_at=NOW() WHERE id=$1`, [pending.id, receipt]);
                await client.query('COMMIT');
              } catch (txError) { await client.query('ROLLBACK'); throw txError; } finally { client.release(); }
            } else {
              await db.query(`UPDATE pending_registrations SET status='paid', mpesa_receipt=$2, result_code=0, updated_at=NOW() WHERE id=$1`, [pending.id, receipt]);
              await db.query(`INSERT INTO users(name,email,password_hash,role,phone,phone_verified,pin_hash,has_pin,verification_status) VALUES('',$1,$2,$3,$4,true,$5,true,'verified') ON CONFLICT(phone) DO NOTHING`, [`phone+${pending.phone}@latielle.local`, await bcrypt.hash(crypto.randomUUID(), 8), pending.role, pending.phone, pending.pin_hash]);
            }
          }
        } else {
          await db.query(`UPDATE pending_registrations SET status='failed', result_code=$2, updated_at=NOW() WHERE id=$1`, [pending.id, resultCode]);
        }
      }
    }
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (error) { next(error); }
});

app.post('/api/auth/login-pin', async (req,res,next)=>{
  try {
    const phone=normalizePhone(req.body.phone), pin=String(req.body.pin||'');
    const r=await db.query(`SELECT * FROM users WHERE phone=$1`,[phone]); const u=r.rows[0];
    if(!u || !u.phone_verified || !u.pin_hash || !(await bcrypt.compare(pin,u.pin_hash))) return res.status(401).json({error:'Invalid phone number or PIN'});
    res.json({success:true,user:phoneUser(u),token:token({id:u.id,email:u.email,role:u.role})});
  }catch(e){next(e)}
});

app.post('/api/auth/set-pin', auth(), async (req,res,next)=>{
  try { const pin=String(req.body.pin||''); if(!/^\d{4}$/.test(pin)) return res.status(400).json({error:'PIN must be exactly 4 digits'}); const hash=await bcrypt.hash(pin,12); const r=await db.query('UPDATE users SET pin_hash=$2,has_pin=true WHERE id=$1 RETURNING *',[req.user.id,hash]); if(!r.rows[0])return res.status(404).json({error:'User not found'}); res.json({success:true,user:phoneUser(r.rows[0])}); }catch(e){next(e)}
});

app.patch('/api/auth/profile', auth(), async (req,res,next)=>{
  try { const allowed=['name','bio','gender','county','subcounty','profile_picture','national_id','selfie_url','id_document_url','favorites','business_docs','verification_status']; const sets=[], vals=[req.user.id]; for(const k of allowed) if(req.body[k]!==undefined){sets.push(`${k}=$${vals.length+1}`); vals.push(typeof req.body[k]==='object'?JSON.stringify(req.body[k]):req.body[k]);} if(!sets.length) return res.json(phoneUser((await db.query('SELECT * FROM users WHERE id=$1',vals)).rows[0])); const r=await db.query(`UPDATE users SET ${sets.join(',')} WHERE id=$1 RETURNING *`,vals); res.json(phoneUser(r.rows[0])); }catch(e){next(e)}
});

/* =====================================================
   GENERIC ENTITY API FOR MIGRATED FRONTEND
===================================================== */
const entityMap = { PhoneUser:'users', User:'users', BusinessListing:'listings' };
function publicEntity(name,row){
  if(name==='PhoneUser') return phoneUser(row);
  if(name==='User') return {...row, name:row.name, phone:row.phone, favorites:row.favorites||[]};
  if(name==='BusinessListing') return {...row, ...(row.metadata || {}), created_date:row.created_at};
  return row;
}

app.get('/api/entities/:entity', optionalAuth, async (req,res,next)=>{
 try{
  const name=req.params.entity;
  if(name!=='BusinessListing' && !req.user) return res.status(401).json({error:'Authentication required'});
  if(name==='BusinessListing'){
    const filters=req.query.filters?JSON.parse(req.query.filters):{}; let q=`SELECT l.*,u.name seller_name,u.email seller_email FROM listings l JOIN users u ON u.id=l.seller_id`; const vals=[]; const clauses=[];
    if(filters.status){vals.push(filters.status);clauses.push(`l.status=$${vals.length}`)}
    if(filters.created_by){vals.push(filters.created_by);clauses.push(`(u.email=$${vals.length} OR u.id::text=$${vals.length})`)}
    if(clauses.length) q+=' WHERE '+clauses.join(' AND '); q+=' ORDER BY l.created_at DESC LIMIT '+Math.min(Number(req.query.limit)||100,200);
    return res.json((await db.query(q,vals)).rows.map(r=>publicEntity(name,r)));
  }
  if(name==='PhoneUser' || name==='User'){
    const filters=req.query.filters?JSON.parse(req.query.filters):{}; const vals=[]; const clauses=[];
    for(const [k,v] of Object.entries(filters)){ const col=k==='phone_number'?'phone':k==='full_name'?'name':k; if(['id','phone','name','role','verification_status'].includes(col)){ vals.push(v); clauses.push(`${col}=$${vals.length}`); } }
    const where=clauses.length?' WHERE '+clauses.join(' AND '):''; const r=await db.query(`SELECT * FROM users${where} ORDER BY created_at DESC LIMIT ${Math.min(Number(req.query.limit)||100,500)}`,vals); return res.json(r.rows.map(x=>publicEntity(name,x)));
  }
  const filters=req.query.filters?JSON.parse(req.query.filters):{}; const vals=[name]; const clauses=['entity_name=$1'];
  for(const [k,v] of Object.entries(filters)){vals.push(v);clauses.push(`data->>$${vals.length}=$${vals.length+0}`)}
  const r=await db.query(`SELECT id,data,created_at,updated_at FROM entity_records WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC LIMIT ${Math.min(Number(req.query.limit)||100,500)}`,vals);
  res.json(r.rows.map(x=>({id:x.id,created_date:x.created_at,updated_date:x.updated_at,...x.data})));
 }catch(e){next(e)}
});

app.get('/api/entities/:entity/:id', optionalAuth, async(req,res,next)=>{
 try{const n=req.params.entity,id=req.params.id;
  if(n!=='BusinessListing' && !req.user) return res.status(401).json({error:'Authentication required'});
  if(n==='BusinessListing') return res.json(publicEntity(n,(await db.query(`SELECT l.*,u.name seller_name,u.email seller_email FROM listings l JOIN users u ON u.id=l.seller_id WHERE l.id=$1`,[id])).rows[0]));
  if(n==='PhoneUser'||n==='User') return res.json(publicEntity(n,(await db.query(`SELECT * FROM users WHERE id=$1`,[id])).rows[0]));
  const r=await db.query(`SELECT id,data,created_at,updated_at FROM entity_records WHERE entity_name=$1 AND id=$2`,[n,id]); if(!r.rows[0]) return res.status(404).json({error:'Not found'}); res.json({id:r.rows[0].id,created_date:r.rows[0].created_at,...r.rows[0].data});
 }catch(e){next(e)}
});

app.post('/api/entities/:entity', auth(), async(req,res,next)=>{
 try{const n=req.params.entity,d=req.body||{};
  if(n==='BusinessListing'){const r=await db.query(`INSERT INTO listings(seller_id,title,description,price,status,metadata) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[req.user.id,d.title||'',d.description||'',d.price||0,d.status||'active',JSON.stringify(Object.fromEntries(Object.entries(d).filter(([k])=>!['title','description','price','status'].includes(k))))]);return res.status(201).json(publicEntity(n,r.rows[0]));}
  const r=await db.query(`INSERT INTO entity_records(entity_name,data) VALUES($1,$2) RETURNING id,data,created_at,updated_at`,[n,JSON.stringify(d)]);res.status(201).json({id:r.rows[0].id,created_date:r.rows[0].created_at,...d});
 }catch(e){next(e)}
});

app.patch('/api/entities/:entity/:id', auth(), async(req,res,next)=>{
 try{const n=req.params.entity,id=req.params.id,d=req.body||{};
  if(n==='BusinessListing') { const r=await db.query(`UPDATE listings SET title=COALESCE($2,title),description=COALESCE($3,description),price=COALESCE($4,price),status=COALESCE($5,status),metadata=metadata || COALESCE($6,'{}'::jsonb),updated_at=NOW() WHERE id=$1 RETURNING *`,[id,d.title,d.description,d.price,d.status,JSON.stringify(Object.fromEntries(Object.entries(d).filter(([k])=>!['title','description','price','status'].includes(k))))]); if(!r.rows[0])return res.status(404).json({error:'Not found'}); return res.json(publicEntity(n,r.rows[0])); }
  if(n==='PhoneUser'||n==='User') { if(id!==req.user.id && req.user.role!=='admin')return res.status(403).json({error:'Forbidden'}); const map={full_name:'name',phone_number:'phone'}; const sets=[],vals=[id]; for(const [k,v] of Object.entries(d)){const col=map[k]||k;if(['name','phone','bio','gender','county','subcounty','profile_picture','national_id','selfie_url','id_document_url','verification_status','favorites','business_docs'].includes(col)){sets.push(`${col}=$${vals.length+1}`);vals.push(typeof v==='object'?JSON.stringify(v):v)}} if(!sets.length)return res.json({id}); const r=await db.query(`UPDATE users SET ${sets.join(',')} WHERE id=$1 RETURNING *`,vals);return res.json(publicEntity(n,r.rows[0])); }
  const old=await db.query(`SELECT data FROM entity_records WHERE entity_name=$1 AND id=$2`,[n,id]); if(!old.rows[0])return res.status(404).json({error:'Not found'}); const merged={...old.rows[0].data,...d}; const r=await db.query(`UPDATE entity_records SET data=$3,updated_at=NOW() WHERE entity_name=$1 AND id=$2 RETURNING *`,[n,id,JSON.stringify(merged)]);res.json({id,...merged});
 }catch(e){next(e)}
});
app.delete('/api/entities/:entity/:id', auth(), async(req,res,next)=>{try{const n=req.params.entity,id=req.params.id;if(n==='BusinessListing'){await db.query('DELETE FROM listings WHERE id=$1',[id]);return res.status(204).end()} await db.query('DELETE FROM entity_records WHERE entity_name=$1 AND id=$2',[n,id]);res.status(204).end()}catch(e){next(e)}});

/* =====================================================
   FUNCTION MIGRATION ENDPOINTS
===================================================== */
app.post('/api/functions/:name', async(req,res,next)=>{
 try{const n=req.params.name,p=req.body||{};
  if(n==='loginWithPin') return res.redirect(307, '/api/auth/login-pin');
  if(n==='setPin') {
    const pin=String(p.pin||'');
    if(!/^\d{4}$/.test(pin)) return res.status(400).json({error:'PIN must be exactly 4 digits'});
    const userId=p.userId || req.user?.id;
    if(!userId) return res.status(401).json({error:'Authentication required'});
    const hash=await bcrypt.hash(pin,12);
    const r=await db.query('UPDATE users SET pin_hash=$2,has_pin=true WHERE id=$1 RETURNING *',[userId,hash]);
    if(!r.rows[0]) return res.status(404).json({error:'User not found'});
    return res.json({success:true,user:phoneUser(r.rows[0])});
  }
  if(n==='submitDetailRequest') { const r=await db.query('INSERT INTO detail_requests(listing_id,buyer_id,message) VALUES($1,$2,$3) RETURNING *',[p.listingId||p.listing_id, p.buyerId||req.user?.id, p.message||'']);return res.json({success:true,request:r.rows[0]}); }
  if(n==='mpesaStkPush') {
    // Existing listing-payment flow.
    const phone=normalizePhone(p.phone); const amount=Number(p.amount||0);
    if(!isKenyanPhone(phone) || !Number.isFinite(amount) || amount<=0) return res.status(400).json({error:'Valid phone number and amount are required'});
    const {token: accessToken,cfg}=await mpesaAccessToken(); const timestamp=new Date().toISOString().replace(/[-:TZ.]/g,'').slice(0,14); const password=mpesaPassword(cfg.shortcode,cfg.passkey,timestamp);
    const response=await fetch(`${cfg.baseUrl}/mpesa/stkpush/v1/processrequest`,{method:'POST',headers:{Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'},body:JSON.stringify({BusinessShortCode:cfg.shortcode,Password:password,Timestamp:timestamp,TransactionType:process.env.MPESA_TRANSACTION_TYPE || 'CustomerPayBillOnline',Amount:Math.round(amount),PartyA:phone.slice(1),PartyB:cfg.shortcode,PhoneNumber:phone.slice(1),CallBackURL:cfg.callbackUrl,AccountReference:String(p.detailRequestId||p.listingId||'LATIELLE'),TransactionDesc:String(p.listingTitle||'Latielle Market Hub payment').slice(0,13)})});
    const data=await response.json().catch(()=>({})); if(!response.ok||data.ResponseCode!=='0') return res.status(502).json({error:data.errorMessage||data.ResponseDescription||'M-Pesa payment request failed'}); return res.json({success:true,checkoutRequestId:data.CheckoutRequestID,merchantRequestId:data.MerchantRequestID,message:'M-Pesa payment prompt sent'});
  }
  if(n==='createNotification'||n.startsWith('notify')) return res.json({success:true});
  if(n==='checkPaymentStatus') return res.json({success:true,status:'pending'});
  return res.status(404).json({error:`Unknown function: ${n}`});
 }catch(e){next(e)}
});

/* =====================================================
   FILES / EMAIL / PASSWORD RESET / AI FALLBACKS
===================================================== */
app.post('/api/upload', auth(), (req,res)=>res.status(501).json({error:'File upload storage is not configured. Add S3/Cloudinary credentials before production uploads.'}));
app.post('/api/email', auth(), (req,res)=>res.json({success:true,queued:false,message:'Email provider not configured'}));
app.post('/api/ai', auth(), (req,res)=>res.json({success:true,answer:'AI support is not configured on this deployment yet.'}));
app.post('/api/auth/forgot-password', async (_req,res)=>res.json({success:true,message:'Password reset is not used for phone/PIN accounts.'}));
app.post('/api/auth/reset-password', async (_req,res)=>res.status(400).json({error:'Password reset is not available for phone/PIN accounts.'}));

// Serve the production React build from the same Express process on Render.
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('/{*splat}', (req,res,next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(distPath, 'index.html'));
});

async function startServer() {
  try {
    const fs = require('fs');
    const schemaPath = path.join(__dirname, '..', 'data', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      await db.query(fs.readFileSync(schemaPath, 'utf8'));
      console.log('Database schema verified.');
    }
    app.listen(PORT, () => console.log(`Latielle Market Hub listening on ${PORT}`));
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

startServer();
