# n8n + PostgreSQL Subscription Backend Guide

This folder contains the complete, 1-click importable **n8n workflow** for managing client store subscriptions, user registrations, and remote lockouts.

---

## 1. Setup PostgreSQL Table

Open your PostgreSQL client (**pgAdmin**, **DBeaver**, or `psql`) and run this query:

```sql
CREATE TABLE IF NOT EXISTS client_subscriptions (
    id SERIAL PRIMARY KEY,
    machine_id VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    contact_no VARCHAR(50) NOT NULL,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    payment_status VARCHAR(20) DEFAULT 'Trial', -- 'Trial', 'Pending', 'Paid'
    date_of_payment TIMESTAMP WITH TIME ZONE,
    trial_ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    paid_until TIMESTAMP WITH TIME ZONE,
    current_subscription_price NUMERIC(10, 2) DEFAULT 1000.00,
    tamper_flag BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_client_subscriptions_machine_id ON client_subscriptions(machine_id);
```

---

## 2. Import Workflow into n8n

1. Open your local n8n interface (`http://localhost:5678`).
2. Click **Workflows** in the sidebar ➔ click the **`...` (three dots)** menu in the top right ➔ select **Import from File**.
3. Select the file:
   `h:\Inventory-Management-System\n8n\inventory-subscription-workflow.json`
4. The workflow will appear on your canvas with two branches:
   - **Branch 1**: `Webhook: /app-register` ➔ `Postgres: Register Client` ➔ `Respond: Register Success`
   - **Branch 2**: `Webhook: /check-status` ➔ `Postgres: Check Subscription` ➔ `Code: Format Status Output` ➔ `Respond: Status JSON`

---

## 3. Link Your PostgreSQL Credentials in n8n

1. Double-click the **Postgres: Register Client** node.
2. In the **Credential to connect with** dropdown, select your PostgreSQL connection (Host: `localhost`, Database: `your_db_name`, User, Password, Port: `5432`).
3. Double-click the **Postgres: Check Subscription** node and select the same credential.
4. Toggle the workflow to **Active** (in the top right corner of n8n).

---

## 4. Webhook URLs & App Integration

Once active, n8n exposes two Production Webhook URLs:
- `http://localhost:5678/webhook/app-register`
- `http://localhost:5678/webhook/check-status`

In your Electron app's `app/.env`:
```env
N8N_WEBHOOK_URL=http://localhost:5678/webhook
SUBSCRIPTION_PRICE=1000
```
*(If tunneling via ngrok / cloudflare tunnel, simply replace `http://localhost:5678/webhook` with your public tunnel URL).*

---

## 5. How You Control Clients from PostgreSQL

All control happens by editing rows in `client_subscriptions`:

| Action | What you do in PostgreSQL | What happens to client |
| :--- | :--- | :--- |
| **Instant Lockout** | `UPDATE client_subscriptions SET payment_status = 'Pending' WHERE machine_id = 'MC-...';` | Client app locks immediately with payment screen. |
| **Grant 30 Days (Paid)** | `UPDATE client_subscriptions SET payment_status = 'Paid', paid_until = NOW() + INTERVAL '30 days' WHERE machine_id = 'MC-...';` | Client app immediately unfreezes and allows full billing. |
| **Change Monthly Price** | `UPDATE client_subscriptions SET current_subscription_price = 1500 WHERE machine_id = 'MC-...';` | Client QR code immediately updates from ₹1,000 to ₹1,500. |
| **Reset Clock Tamper** | `UPDATE client_subscriptions SET tamper_flag = FALSE WHERE machine_id = 'MC-...';` | Clears tamper lock on client. |
