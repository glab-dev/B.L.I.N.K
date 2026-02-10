var fs = require('fs');
var path = require('path');
var dirs = ['core', 'specs', 'layouts', 'structure', 'interact', 'nav', 'export', 'config', 'screens'];
var fail = 0;
var total = 0;
dirs.forEach(function(d) {
  var p = path.join('c:/Users/gabla/Desktop/LED-Calculator', d);
  if (!fs.existsSync(p)) return;
  fs.readdirSync(p).filter(function(f) { return f.endsWith('.js'); }).forEach(function(f) {
    total++;
    try {
      new Function(fs.readFileSync(path.join(p, f), 'utf8'));
      console.log('PASS', d + '/' + f);
    } catch(e) {
      fail++;
      console.log('FAIL', d + '/' + f, e.message);
    }
  });
});
console.log('---');
console.log(total + ' files checked, ' + fail + ' failures');
