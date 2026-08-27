require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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

app.post(
  '/api/payments/mpesa/callback',
  async (req, res, next) => {
    try {
      await db.query(
        `
        INSERT INTO payment_events (
          provider,
          payload
        )
        VALUES ($1, $2)
        `,
        [
          'mpesa',
          JSON.stringify(req.body),
        ]
      );

      res.json({
        ResultCode: 0,
        ResultDesc: 'Accepted',
      });
    } catch (error) {
      next(error);
    }
  }
);

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
  return String(phone || '').replace(/\s+/g, '');
}
function phoneUser(row) {
  if (!row) return null;
  return {
    id: row.id, phone_number: row.phone, full_name: row.name || '', role: row.role,
    is_verified: row.phone_verified, has_pin: row.has_pin, bio: row.bio, gender: row.gender,
    county: row.county, subcounty: row.subcounty, profile_picture: row.profile_picture,
    favorites: row.favorites || [], verification_status: row.verification_status || 'unverified',
  };
}

app.post('/api/auth/send-otp', async (req, res, next) => {
  try {
    const phone = normalizePhone(req.body.phone);
    if (!phone || phone.length < 10) return res.status(400).json({ error: 'Valid phone number is required' });
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await db.query(`UPDATE otp_codes SET consumed=true WHERE phone=$1 AND consumed=false`, [phone]);
    await db.query(`INSERT INTO otp_codes(phone, code, expires_at) VALUES($1,$2,NOW()+INTERVAL '10 minutes')`, [phone, code]);
    console.log(`[LATIELLE OTP] ${phone}: ${code}`);
    res.json({ success: true, message: 'Verification code generated', dev_code: process.env.NODE_ENV === 'production' ? undefined : code });
  } catch (e) { next(e); }
});

app.post('/api/auth/verify-otp', async (req, res, next) => {
  try {
    const phone = normalizePhone(req.body.phone), code = String(req.body.code || ''), role = ['buyer','seller'].includes(req.body.role) ? req.body.role : 'buyer';
    const otp = await db.query(`SELECT * FROM otp_codes WHERE phone=$1 AND code=$2 AND consumed=false AND expires_at>NOW() ORDER BY created_at DESC LIMIT 1`, [phone, code]);
    if (!otp.rows[0]) return res.status(400).json({ error: 'Invalid or expired verification code' });
    await db.query(`UPDATE otp_codes SET consumed=true WHERE id=$1`, [otp.rows[0].id]);
    let u = (await db.query(`SELECT * FROM users WHERE phone=$1`, [phone])).rows[0];
    if (!u) {
      u = (await db.query(`INSERT INTO users(name,email,password_hash,role,phone,phone_verified) VALUES($1,$2,$3,$4,$5,true) RETURNING *`, ['','phone+'+phone+'@latielle.local', await bcrypt.hash(String(Math.random()), 8), role, phone])).rows[0];
    } else {
      await db.query(`UPDATE users SET phone_verified=true, role=CASE WHEN role='admin' THEN role ELSE $2 END WHERE id=$1`, [u.id, role]);
      u = (await db.query(`SELECT * FROM users WHERE id=$1`, [u.id])).rows[0];
    }
    res.json({ success: true, user: phoneUser(u), token: token({id:u.id,email:u.email,role:u.role}) });
  } catch(e) { next(e); }
});

app.post('/api/auth/login-pin', async (req,res,next)=>{
  try {
    const phone=normalizePhone(req.body.phone), pin=String(req.body.pin||'');
    const r=await db.query(`SELECT * FROM users WHERE phone=$1`,[phone]); const u=r.rows[0];
    if(!u || !u.pin_hash || !(await bcrypt.compare(pin,u.pin_hash))) return res.status(401).json({error:'Invalid phone number or PIN'});
    res.json({success:true,user:phoneUser(u),token:token({id:u.id,email:u.email,role:u.role})});
  }catch(e){next(e)}
});

app.post('/api/auth/set-pin', auth(), async (req,res,next)=>{
  try {
    const pin=String(req.body.pin||''); if(!/^\d{4}$/.test(pin)) return res.status(400).json({error:'PIN must be exactly 4 digits'});
    const hash=await bcrypt.hash(pin,12); const r=await db.query(`UPDATE users SET pin_hash=$2,has_pin=true WHERE id=$1 RETURNING *`,[req.user.id,hash]);
    res.json({success:true,user:phoneUser(r.rows[0])});
  }catch(e){next(e)}
});

app.patch('/api/auth/profile', auth(), async (req,res,next)=>{
  try { const allowed=['name','bio','gender','county','subcounty','profile_picture','national_id','selfie_url','id_document_url','favorites','business_docs','verification_status'];
    const sets=[], vals=[req.user.id]; for(const k of allowed) if(req.body[k]!==undefined){sets.push(`${k}=$${vals.length+1}`); vals.push(typeof req.body[k]==='object'?JSON.stringify(req.body[k]):req.body[k]);}
    if(!sets.length) return res.json(phoneUser((await db.query('SELECT * FROM users WHERE id=$1',vals)).rows[0]));
    const r=await db.query(`UPDATE users SET ${sets.join(',')} WHERE id=$1 RETURNING *`,vals); res.json(phoneUser(r.rows[0]));
  }catch(e){next(e)}
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
  if(n==='loginWithPin'){const r=await db.query('SELECT * FROM users WHERE phone=$1',[normalizePhone(p.phone)]);const u=r.rows[0];if(!u||!u.pin_hash||!(await bcrypt.compare(String(p.pin||''),u.pin_hash)))return res.status(401).json({error:'Invalid phone number or PIN'});return res.json({success:true,user:phoneUser(u),token:token({id:u.id,email:u.email,role:u.role})});}
  if(n==='sendOTP') { req.url='/api/auth/send-otp'; const phone=normalizePhone(p.phone); const code=String(Math.floor(100000+Math.random()*900000)); await db.query('UPDATE otp_codes SET consumed=true WHERE phone=$1',[phone]); await db.query("INSERT INTO otp_codes(phone,code,expires_at) VALUES($1,$2,NOW()+INTERVAL '10 minutes')",[phone,code]); console.log(`[LATIELLE OTP] ${phone}: ${code}`); return res.json({success:true,dev_code:process.env.NODE_ENV==='production'?undefined:code}); }
  if(n==='verifyOTP') { const r=await db.query(`SELECT * FROM otp_codes WHERE phone=$1 AND code=$2 AND consumed=false AND expires_at>NOW() ORDER BY created_at DESC LIMIT 1`,[normalizePhone(p.phone),String(p.code||'')]);if(!r.rows[0])return res.status(400).json({error:'Invalid or expired verification code'});await db.query('UPDATE otp_codes SET consumed=true WHERE id=$1',[r.rows[0].id]);let u=(await db.query('SELECT * FROM users WHERE phone=$1',[normalizePhone(p.phone)])).rows[0];if(!u)u=(await db.query(`INSERT INTO users(name,email,password_hash,role,phone,phone_verified) VALUES('',$1,$2,$3,$4,true) RETURNING *`,['phone+'+normalizePhone(p.phone)+'@latielle.local',await bcrypt.hash(String(Math.random()),8),['buyer','seller'].includes(p.role)?p.role:'buyer',normalizePhone(p.phone)])).rows[0];return res.json({success:true,user:phoneUser(u),token:token({id:u.id,email:u.email,role:u.role})}); }
  if(n==='setPin') { const hash=await bcrypt.hash(String(p.pin||''),12); const r=await db.query('UPDATE users SET pin_hash=$2,has_pin=true WHERE id=$1 RETURNING *',[p.userId,hash]);if(!r.rows[0])return res.status(404).json({error:'User not found'});return res.json({success:true,user:phoneUser(r.rows[0])}); }
  if(n==='submitDetailRequest') { const r=await db.query('INSERT INTO detail_requests(listing_id,buyer_id,message) VALUES($1,$2,$3) RETURNING *',[p.listingId||p.listing_id, p.buyerId||req.user?.id, p.message||'']);return res.json({success:true,request:r.rows[0]}); }
  if(n==='mpesaStkPush') return res.json({success:false,error:'M-Pesa STK integration requires valid production credentials',status:'not_configured'});
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
