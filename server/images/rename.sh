#!/bin/bash
mv 'Screenshot 2025-08-03 at 11.28.01 PM (2).jpg' anthony-edwards.jpg 2>/dev/null || echo "Skipped (2).jpg"
mv 'Screenshot 2025-08-03 at 11.28.01 PM (2).png' steph-curry.jpg 2>/dev/null || echo "Skipped (2).png"
mv 'Screenshot 2025-08-03 at 11.28.01 PM (7).png' shai-gilgeous-alexander.jpg 2>/dev/null || echo "Skipped (7).png"
mv 'Screenshot 2025-08-03 at 11.28.01 PM (3).png' lebron-james.jpg 2>/dev/null || echo "Skipped (3).png"
mv 'Screenshot 2025-08-03 at 11.28.01 PM (4).png' kevin-durant.jpg 2>/dev/null || echo "Skipped (4).png"
mv 'Screenshot 2025-08-03 at 11.28.01 PM (5).png' jayson-tatum.jpg 2>/dev/null || echo "Skipped (5).png"
echo "Done! Files renamed:"
ls -1 | grep -E "(anthony|steph|shai|lebron|kevin|jayson)"
