const fs = require('fs');
const { resolve, join } = require('path');
const routesFolder = resolve('./routes');

function camelCaseToDash(myStr) {
  return myStr.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

// HELPER FUNCTION TO GET ALL ROUTES PATH
const getAllRoutesPath = function (dir) {
  const allRoutesPath = [];

  // Recursive function to traverse directories
  const traverseDirectory = (currentDir, parentPath = '') => {
    fs.readdirSync(currentDir).forEach((file) => {
      const fullPath = join(currentDir, file);

      //  If it's a directory, recurse into it
      if (fs.statSync(fullPath).isDirectory()) {
        const newParentPath = join(parentPath, file); //  Update the parentPath with the folder name
        traverseDirectory(fullPath, newParentPath);
      } else if (fs.existsSync(fullPath) && fullPath.endsWith('.route.js')) {
        //  If it's a file that ends with .route.js, add it to the array
        allRoutesPath.push({
          fullPath: fullPath.replace('.js', ''), // Remove .js extension
          //  Combine parent path and file name (without .route.js) for nested structure
          fileName: join(parentPath, file.replace('.route.js', '')),
        });
      }
    });
  };

  traverseDirectory(dir);

  return allRoutesPath;
};

// MAIN FUNCTION TO REGISTER ALL ROUTES
const registerRoutes = function (expressInstance) {
  const allRoutesPath = getAllRoutesPath(routesFolder);

  // LOAD ALL NESTED ROUTES FILE
  for (const routeFile of allRoutesPath) {
    const router = require(routeFile.fullPath);
    expressInstance.use(`/api/${camelCaseToDash(routeFile.fileName)}`, router);
  }
};

module.exports = {
  registerRoutes,
};
