import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  if (req.method === 'POST') {
    const filePath = path.join(process.cwd(), 'public', 'current.png');

    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: 'Error deleting the file.' });
        }
        res.status(200).json({ message: 'File deleted successfully.' });
      });
    } else {
      res.status(404).json({ message: 'File not found.' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
