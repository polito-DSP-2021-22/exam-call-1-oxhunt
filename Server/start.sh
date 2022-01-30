DIR="$(dirname "$(realpath "$0")")"
"$DIR"/resetDB.sh
nodemon --config nodemon-config.json --exec npm start
