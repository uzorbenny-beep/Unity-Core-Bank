import AdmZip from 'adm-zip';
import fs from 'fs';

try {
  if (!fs.existsSync('dist')) {
    console.error("Error: 'dist' folder does not exist! Run npm run build first.");
    process.exit(1);
  }

  const zip = new AdmZip();
  // This adds all files and subdirectories inside 'dist' to the root of the zip file
  zip.addLocalFolder('dist');
  zip.writeZip('public_html.zip');
  console.log('Successfully zipped dist folder contents into public_html.zip!');
} catch (error) {
  console.error('An error occurred while zipping:', error);
  process.exit(1);
}
