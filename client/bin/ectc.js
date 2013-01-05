var fs = require('fs');
var path = require('path');
var ECT = require('ect');

var inFile = process.argv[2];
var templatePath = path.dirname(inFile);
var templateFile = path.basename(inFile);

var renderer = ECT({ root : templatePath });

renderer.render(templateFile, {}, function (err, html) {
  if(err) {
    console.error("Error rendering template " + inFile + ": " + err);
    process.exit(1);
  } else {
    console.log(html);
  }
});
