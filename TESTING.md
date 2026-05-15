# TESTING.md — verify each Phase 2 piece before going live

When you wire up a new client and configure their Render env vars, run these
test scripts FROM YOUR LAPTOP before testing end-to-end with a real phone.
Each script gives a clear pass/fail and points at the most likely cause if
it fails.

All scripts read from `~/.tier1-config/.env` where applicable (per the
TEDDY-SETUP.md flow).

---

## 1. Twilio — does sending an SMS work?

```bash
./scripts/test-twilio.sh +1YOUR_OWN_CELL
```

What it does:
- Reads `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` from your `.env`
- Sends a one-line test SMS from your default Twilio number to the phone
  you specify
- Costs ~$0.008 per run

Pass: you receive the SMS within 30 seconds.
Fail: script prints the API error + most likely cause (wrong format,
A2P registration missing, etc.)

---

## 2. DeepSeek — does the AI key work?

```bash
./scripts/test-deepseek.sh
```

What it does:
- Reads `DEEPSEEK_API_KEY` from your `.env` (or pass as `$1`)
- Sends a tiny test prompt to `deepseek-chat`
- Costs less than $0.001

Pass: prints `Reply: TIER2 SMS BOT OK` and token usage.
Fail: script prints the DeepSeek error type + cause.

---

## 3. Cal.com — does the booking API work?

```bash
./scripts/test-cal-com.sh cal_live_xxx 12345
```

What it does:
- Hits `GET /v2/slots` for the given event type, looking 7 days ahead
- Read-only — doesn't book anything
- No env file — passes API key + event type ID as args
  (because Cal.com creds are per-client, not stored in your laptop env)

Pass: prints "Days with availability: N" and the first 10 slot timestamps.
Fail: script prints HTTP status + likely cause (invalid key, wrong event
type ID, no availability rules set, etc.)

If the slot list is empty but the API call succeeds: the event type has
no availability configured in Cal.com. The client needs to set their
working hours under the event type → Availability tab.

---

## 4. End-to-end on a real Render deploy

After all 3 above pass and you've set the env vars on Render, the actual
end-to-end test is:

### Phase 2A — TextFlow lead auto-response
1. Submit the QuoteForm on the live marketing site
2. Within 30 seconds, the test phone receives an SMS via TextFlow
3. The lead also appears in your TextFlow inbox AND in `/admin` leads dashboard

### Phase 2B — Missed-call text-back
1. From a phone that's NOT the client's cell, call the client's REAL number
2. Don't answer — let it ring out (carrier should forward to Twilio after ~30s)
3. The calling phone receives an SMS within ~30 seconds of the call ending
4. Reply to the SMS → bot replies (template if no DeepSeek key, AI if set)

### Phase 2C — Review-request SMS on job complete
1. Log into the CRM as a user
2. Open a contact, add a job
3. Click "Mark Complete" on the job
4. Customer phone receives the review-request SMS
5. Click "Mark Complete" again → toast says "already_sent" — no duplicate

### Phase 2D — AI books into Cal.com
1. From any phone, text the client's Twilio number something like
   *"Hey I need a roof inspection on my house in Boca next week"*
2. AI replies asking what kind of project / urgency
3. AI calls `check_availability`, then proposes 2-3 specific times
4. Reply with one of the times
5. AI asks for your name (if not given), then calls `book_appointment`
6. AI replies confirming the booking
7. Verify the booking lands in Cal.com → My Bookings

### What to do if a step fails
- Check Render logs for the specific webhook (`/api/voice/incoming`,
  `/api/sms/incoming`, `/api/leads`, etc.)
- All Twilio webhook errors include `dialStatus` / `From` / `To` in the
  log entry — search for those
- AI failures fall back to template; if the AI isn't being used, check
  that `DEEPSEEK_API_KEY` is actually set (it's the most common silent
  fallback cause)
- Cal.com tool errors are caught and the AI recovers gracefully
  ("Let me have someone call you back instead") — check Render logs for
  `Tool execution failed` entries to see the underlying Cal.com error

---

## What these tests do NOT cover

- The CRM frontend rendering — you'll know if it's broken by visual inspection
- Twilio webhook signature verification — the production code does verify;
  bypass via `SKIP_TWILIO_SIGNATURE_VERIFY=true` only during local dev
- Cost accounting — Twilio + DeepSeek + Cal.com all charge per use; nothing
  here surfaces costs back into the dashboard yet
