import assert from 'node:assert/strict'
import { parseDump } from '../sql.mjs'

const dump = `
-- comment ; with semicolon
/*!40101 SET NAMES utf8 */;
CREATE TABLE \`tblclients\` (
  \`userid\` int(11) NOT NULL AUTO_INCREMENT,
  \`company\` varchar(191) DEFAULT NULL,
  \`active\` int(11) NOT NULL DEFAULT 1,
  PRIMARY KEY (\`userid\`),
  KEY \`company\` (\`company\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO \`tblclients\` VALUES (1,'O\\'Brien; & Co',1),(2,NULL,0),(3,'multi
line \\\\ back','1');
INSERT INTO \`tblclients\` (\`userid\`,\`company\`) VALUES (4,'it''s ok');
`
const out = [...parseDump(dump)]
assert.equal(out[0].type, 'table')
assert.deepEqual(out[0].columns, ['userid', 'company', 'active'])
assert.deepEqual(out[0].pk, ['userid'])
assert.equal(out[1].table, 'clients')
assert.deepEqual(out[1].rows[0], ['1', "O'Brien; & Co", '1'])
assert.deepEqual(out[1].rows[1], ['2', null, '0'])
assert.equal(out[1].rows[2][1], 'multi\nline \\ back')
assert.deepEqual(out[2].columns, ['userid', 'company'])
assert.deepEqual(out[2].rows[0], ['4', "it's ok"])
console.log('sql.test.mjs ok')
