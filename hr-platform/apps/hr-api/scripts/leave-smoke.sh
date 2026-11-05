#!/usr/bin/env bash
# Local smoke test for the leave endpoints against `npm run dev` (port 8787), using minted dev tokens.
# Creates one pending request for employee 17, approves it as director 5, and prints each result.
# Usage: from apps/hr-api, `bash scripts/leave-smoke.sh`. Needs a leave type 1 (25 days) and 2 (10 days).
set -u
tok() { npm run --silent token -- --user "$1" --role "$2" 2>/dev/null | tail -1; }
EMP=$(tok 17 employee); DIR=$(tok 5 hr_director)
API=http://localhost:8787/api/v1/leave
post() { curl -s -w " [%{http_code}]\n" -X POST "$1" -H "Authorization: Bearer $2" -H 'Content-Type: application/json' -d "$3"; }
get() { curl -s -w " [%{http_code}]\n" -H "Authorization: Bearer $2" "$1"; }

echo "== me";                       get $API/me "$EMP" | cut -c1-240
echo "== create Mon-Fri 7-11 Dec";  R=$(curl -s -X POST $API/requests -H "Authorization: Bearer $EMP" -H 'Content-Type: application/json' -d '{"leaveTypeId":1,"startDate":"2026-12-07","endDate":"2026-12-11","reason":"smoke test"}'); echo "$R"
ID=$(echo "$R" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).id||""))')
echo "== overlap (422)";            post $API/requests "$EMP" '{"leaveTypeId":1,"startDate":"2026-12-09","endDate":"2026-12-10","reason":""}'
echo "== impossible date (422)";    post $API/requests "$EMP" '{"leaveTypeId":1,"startDate":"2026-02-30","endDate":"2026-03-01","reason":""}'
echo "== over balance (422)";       post $API/requests "$EMP" '{"leaveTypeId":2,"startDate":"2027-01-04","endDate":"2027-02-12","reason":""}'
echo "== employee approvals (403)"; get $API/approvals "$EMP"
echo "== employee decides (403)";   post $API/requests/$ID/decision "$EMP" '{"decision":"approve"}'
echo "== director queue";           curl -s -H "Authorization: Bearer $DIR" $API/approvals | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log(j.count,"pending;",JSON.stringify(j.results.find(r=>r.id==process.argv[1])||null))})' "$ID"
echo "== director approves";        post $API/requests/$ID/decision "$DIR" '{"decision":"approve"}'
echo "== decide again (409)";       post $API/requests/$ID/decision "$DIR" '{"decision":"reject"}'
echo "== cancel approved (409)";    post $API/requests/$ID/cancel "$EMP" '{}'
echo "== balance after";            curl -s -H "Authorization: Bearer $EMP" $API/me | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.stringify(JSON.parse(s).balances[0])))'
echo "== other tenant";             OT=$(npm run --silent token -- --company 2 --user 17 --role hr_director 2>/dev/null | tail -1); curl -s -H "Authorization: Bearer $OT" $API/approvals | cut -c1-120; echo
echo "TESTID=$ID"
