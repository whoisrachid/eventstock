#!/bin/bash
# Lance les tests SQL sur une base Postgres LOCALE neuve (jamais sur la production).
# Usage : PSQL="psql -h localhost -U postgres -d test_eventstock" ./supabase/tests/run.sh
set -e
cd "$(dirname "$0")"
PSQL=${PSQL:-psql}
files="00_auth_stub.sql $(ls ../migrations/*.sql)"
for f in $files; do $PSQL -q -v ON_ERROR_STOP=1 -f "$f"; done
cat 01_setup.sql $(ls [0-9][0-9]_*.sql | grep -v -e 00_ -e 01_) | $PSQL -q -v ON_ERROR_STOP=1
echo "Tous les tests SQL sont passés."
