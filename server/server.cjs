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

app.listen(PORT, () => {
  console.log(
    `Latielle Market Hub listening on ${PORT}`
  );
});
