require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET is required');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');

app.use(cors({ origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : true }));
app.use(express.json({limit:'2mb'}));

function token(user){ return jwt.sign({id:user.id,email:user.email,role:user.role}, JWT_SECRET, {expiresIn:'7d'}); }
function auth(roles){
 return (req,res,next)=>{
  const h=req.headers.authorization||'', t=h.startsWith('Bearer ')?h.slice(7):null;
  if(!t) return res.status(401).json({error:'Authentication required'});
  try { req.user=jwt.verify(t,JWT_SECRET); if(roles && !roles.includes(req.user.role)) return res.status(403).json({error:'Forbidden'}); next(); }
  catch { return res.status(401).json({error:'Invalid or expired token'}); }
 };
}
app.get('/api/health', async (_q,res)=>{
 try { await db.query('select 1'); res.json({ok:true,database:true}); }
 catch(e){ res.status(503).json({ok:false,database:false,error:e.message}); }
});

app.post('/api/auth/register', async (req,res)=>{
 const {name,email,password,role='buyer'}=req.body;
 if(!name||!email||!password) return res.status(400).json({error:'Name, email and password are required'});
 if(!['buyer','seller'].includes(role)) return res.status(400).json({error:'Invalid role'});
 try{
  const hash=await bcrypt.hash(password,12);
  const r=await db.query('insert into users(name,email,password_hash,role) values($1,$2,$3,$4) returning id,name,email,role',[name,email.toLowerCase(),hash,role]);
  res.status(201).json({user:r.rows[0],token:token(r.rows[0])});
 }catch(e){ if(e.code==='23505') return res.status(409).json({error:'Email already registered'}); throw e; }
});
app.post('/api/auth/login', async(req,res)=>{
 const {email,password}=req.body;
 const r=await db.query('select * from users where email=$1',[String(email||'').toLowerCase()]);
 const u=r.rows[0];
 if(!u || !(await bcrypt.compare(password||'',u.password_hash))) return res.status(401).json({error:'Invalid email or password'});
 const user={id:u.id,name:u.name,email:u.email,role:u.role}; res.json({user,token:token(user)});
});
app.get('/api/me',auth(),async(req,res)=>{
 const r=await db.query('select id,name,email,role,created_at from users where id=$1',[req.user.id]);
 res.json(r.rows[0]);
});

app.get('/api/listings',async(req,res)=>{
 const r=await db.query(`select l.*,u.name seller_name from listings l join users u on u.id=l.seller_id
 where ($1::text is null or l.status=$1) order by l.created_at desc`,[req.query.status||'active']);
 res.json(r.rows);
});
app.get('/api/listings/:id',async(req,res)=>{
 const r=await db.query('select l.*,u.name seller_name from listings l join users u on u.id=l.seller_id where l.id=$1',[req.params.id]);
 if(!r.rows[0]) return res.status(404).json({error:'Listing not found'}); res.json(r.rows[0]);
});
app.post('/api/listings',auth(['seller','admin']),async(req,res)=>{
 const {title,description='',price}=req.body;
 if(!title || price===undefined) return res.status(400).json({error:'Title and price are required'});
 const r=await db.query('insert into listings(seller_id,title,description,price) values($1,$2,$3,$4) returning *',[req.user.id,title,description,price]);
 res.status(201).json(r.rows[0]);
});
app.patch('/api/listings/:id',auth(['seller','admin']),async(req,res)=>{
 const own=await db.query('select * from listings where id=$1',[req.params.id]);
 if(!own.rows[0]) return res.status(404).json({error:'Listing not found'});
 if(req.user.role!=='admin' && own.rows[0].seller_id!==req.user.id) return res.status(403).json({error:'Forbidden'});
 const {title,description,price,status}=req.body;
 const r=await db.query(`update listings set title=coalesce($2,title),description=coalesce($3,description),
 price=coalesce($4,price),status=coalesce($5,status),updated_at=now() where id=$1 returning *`,
 [req.params.id,title,description,price,status]); res.json(r.rows[0]);
});
app.delete('/api/listings/:id',auth(['seller','admin']),async(req,res)=>{
 const r=await db.query('delete from listings where id=$1 and ($2::boolean or seller_id=$3) returning id',[req.params.id,req.user.role==='admin',req.user.id]);
 if(!r.rows[0]) return res.status(404).json({error:'Listing not found or forbidden'}); res.status(204).end();
});

app.get('/api/dashboard/seller',auth(['seller','admin']),async(req,res)=>{
 const r=await db.query(`select count(*) total, count(*) filter(where status='active') active,
 coalesce(sum(price) filter(where status='sold'),0) sold_value from listings where seller_id=$1`,[req.user.id]);
 res.json(r.rows[0]);
});
app.get('/api/dashboard/admin',auth(['admin']),async(_req,res)=>{
 const [u,l]=await Promise.all([db.query('select count(*) total_users from users'),db.query('select count(*) total_listings from listings')]);
 res.json({...u.rows[0],...l.rows[0]});
});

app.post('/api/requests',auth(),async(req,res)=>{
 const {listing_id,message=''}=req.body;
 if(!listing_id) return res.status(400).json({error:'listing_id is required'});
 const r=await db.query('insert into detail_requests(listing_id,buyer_id,message) values($1,$2,$3) returning *',[listing_id,req.user.id,message]);
 res.status(201).json(r.rows[0]);
});
app.get('/api/requests/mine',auth(),async(req,res)=>{
 const r=await db.query('select * from detail_requests where buyer_id=$1 order by created_at desc',[req.user.id]); res.json(r.rows);
});

app.post('/api/payments/mpesa/callback',async(req,res)=>{
 await db.query('insert into payment_events(provider,payload) values($1,$2)', ['mpesa', JSON.stringify(req.body)]);
 res.json({ResultCode:0,ResultDesc:'Accepted'});
});

app.use(express.static(path.join(__dirname,'..','dist')));
app.get(/^(?!\/api).*/,(_req,res)=>res.sendFile(path.join(__dirname,'..','dist','index.html')));
app.use((err,_req,res,_next)=>{ console.error(err); res.status(500).json({error:'Internal server error'}); });
app.listen(PORT,()=>console.log(`Latielle Market Hub listening on ${PORT}`));
