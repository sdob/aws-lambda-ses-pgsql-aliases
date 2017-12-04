export default function makeLookup(client) {
  const { QUERY } = process.env;
  return values => client.query(QUERY, values).then(result => result.rows[0]);
}
