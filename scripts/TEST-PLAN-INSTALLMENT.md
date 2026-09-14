# TEST PLAN - INSTALLMENT PAYMENT FEATURE

## 1. INSTALLMENT PLAN SETUP (ADMIN)

### 1.1 Create Installment Plan
- [ ] Admin opens bill detail page
- [ ] Click "Buat Rencana Cicilan" form appears
- [ ] Set total installments = 3, amount = Rp75.000, due dates
- [ ] Submit form
- [ ] Verify: success toast appears
- [ ] Verify: installment info card appears on bill detail
- [ ] Verify: installment_plan saved in database

### 1.2 Installment Plan Validation
- [ ] Try total installments = 1 → should reject (min 2)
- [ ] Try total installments = 13 → should reject (max 12)
- [ ] Try amount = 0 → should reject
- [ ] Try empty due dates → should reject
- [ ] Try total installment amount < bill amount → should reject

### 1.3 Mark First Installment as Paid
- [ ] Create plan with "Cicilan 1 sudah dibayar" checked
- [ ] Verify: current_installment = 2, paid_installments = [1]

### 1.4 Remove Installment Plan
- [ ] Click "Hapus" button
- [ ] Confirm removal
- [ ] Verify: installment info card disappears
- [ ] Verify: installment_plan = null in database

---

## 2. PAYMENT FLOW WITH INSTALLMENT PLAN

### 2.1 Scheduled Installment Payment (Admin)
- [ ] Bill has installment plan (current = 2, amount = Rp75.000)
- [ ] Admin opens "Catat Pembayaran" modal
- [ ] Verify: amount field pre-filled with Rp75.000
- [ ] Verify: amount field is read-only
- [ ] Verify: label shows "Cicilan 2/3"
- [ ] Submit payment
- [ ] Verify: payment created with status completed
- [ ] Verify: bill status remains partial
- [ ] Verify: installment_plan.current_installment = 3
- [ ] Verify: installment_plan.paid_installments = [1,2]

### 2.2 Scheduled Installment Payment (Parent)
- [ ] Parent opens bill detail page with installment plan
- [ ] Click "Bayar Sekarang"
- [ ] Verify: amount field pre-filled with installment amount
- [ ] Verify: amount field is read-only
- [ ] Verify: label shows "Cicilan 2/3"
- [ ] Complete payment flow
- [ ] Verify: payment created
- [ ] Verify: installment plan updated

### 2.3 Wrong Amount Rejection
- [ ] Try to pay Rp50.000 instead of Rp75.000
- [ ] Verify: error message "Installment amount must be exactly Rp75.000"
- [ ] Verify: payment NOT created

### 2.4 Overpayment Prevention
- [ ] Try to pay more than installment amount (if scheduled)
- [ ] Verify: error or capped at installment amount

---

## 3. FINAL INSTALLMENT PAYMENT

### 3.1 Pay Last Installment
- [ ] Bill has 3 installments, current = 3
- [ ] Pay installment 3
- [ ] Verify: payment created
- [ ] Verify: bill status changes to "paid"
- [ ] Verify: all payments sum >= bill amount

---

## 4. NON-INSTALLMENT BILL (REGRESSION)

### 4.1 Normal Full Payment
- [ ] Bill without installment plan
- [ ] Admin/parent pays full amount
- [ ] Verify: bill status = paid
- [ ] Verify: payment created normally

### 4.2 Normal Partial Payment (if allowed)
- [ ] Bill without installment plan, allow_installments = true
- [ ] Pay any amount >= minimum_installment_amount
- [ ] Verify: bill status = partial
- [ ] Verify: can pay again

---

## 5. WEBHOOK & GATEWAY INTEGRATION

### 5.1 Mock Webhook Success with Installment
- [ ] Create payment via gateway with installment bill
- [ ] Simulate webhook success
- [ ] Verify: payment completed
- [ ] Verify: installment plan updated
- [ ] Verify: bill status correct

### 5.2 Webhook Expired with Installment
- [ ] Bill has installment plan, payment completed
- [ ] Simulate webhook expired
- [ ] Verify: payment marked as failed
- [ ] Verify: installment plan reverted (current_installment decreased)
- [ ] Verify: bill status reverted to partial/pending

---

## 6. UI/UX VERIFICATION

### 6.1 Admin Bill Detail
- [ ] Installment info card visible when plan exists
- [ ] Installment info card hidden when no plan
- [ ] Payment modal shows installment info
- [ ] Amount field disabled for scheduled installments
- [ ] Form validation works

### 6.2 Parent Bill Detail
- [ ] Installment info card visible when plan exists
- [ ] Installment info card hidden when no plan
- [ ] Payment page shows installment schedule
- [ ] Amount field disabled for scheduled installments

### 6.3 Payment History
- [ ] Installment payments appear in history
- [ ] Status badges correct
- [ ] Receipt link works

---

## 7. EDGE CASES

### 7.1 Duplicate Payment Prevention
- [ ] Try to pay same installment twice
- [ ] Verify: second payment rejected

### 7.2 Bill Status After Partial Installment
- [ ] Pay installment 1 of 3
- [ ] Verify: bill status = partial (not paid)
- [ ] Verify: remaining balance correct

### 7.3 Cross-School Prevention
- [ ] Try to setup installment for bill from different school
- [ ] Verify: access denied

### 7.4 Paid Bill Protection
- [ ] Try to setup installment for already paid bill
- [ ] Verify: error "Tidak dapat mengatur cicilan..."

---

## 8. DATA INTEGRITY

### 8.1 Bill Status Consistency
- [ ] All paid bills have total payments >= amount
- [ ] All partial bills have total payments > 0 and < amount
- [ ] All pending bills have total payments = 0

### 8.2 Installment Plan Consistency
- [ ] paid_installments array contains only valid installment numbers
- [ ] current_installment = max(paid_installments) + 1
- [ ] current_installment <= total_installments
- [ ] Sum of all installment amounts >= bill amount

---

## QUICK SMOKE TEST (5 MINUTES)

1. Admin creates installment plan (3x Rp75.000) for bill Rp225.000
2. Verify installment info appears
3. Admin pays installment 1 → verify partial
4. Admin pays installment 2 → verify partial
5. Admin pays installment 3 → verify paid
6. Check payment history shows all 3 payments
7. Check bill detail shows correct status throughout

---

## AUTOMATED TESTS

```bash
# Run all automated tests
node scripts/test-installment-flow.cjs
node scripts/test-webhook-fix.cjs
node scripts/test-midtrans-expired.cjs
node scripts/test-admin-payment-flow.cjs
```
