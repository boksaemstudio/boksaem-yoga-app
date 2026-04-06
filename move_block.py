import re

with open('public/home.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Clean up any potential CR/LF issues
content = content.replace('\r\n', '\n')

# The block starts here:
start_marker = "            <!-- 디테일 페이지 유도 -->\n            <div style=\"text-align: center; margin-top: 60px;"
start_idx = content.find(start_marker)

# The block ends right before section 5
end_marker = "                </div>\n            </div>\n        </div>\n    </section>\n\n    <!-- 5. 직접 체험 데모 섹션 -->"
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print(f"Error: start={start_idx}, end={end_idx}")
    exit(1)

# Extract block
extracted_block = content[start_idx:end_idx]

# Delete original block
content = content[:start_idx] + content[end_idx:]

# The injection point is right after demo grid ends, but before #live-demo section ends
inj_marker = "                </div>\n\n            </div>\n        </div>\n    </section>\n\n    <!-- 6. 가격 Section -->"
inj_idx = content.find(inj_marker)

if inj_idx == -1:
    print("Injection marker not found")
    exit(1)

# Insert block
# Adding padding to maintain structure
new_content = content[:inj_idx] + "\n" + extracted_block + "\n" + content[inj_idx:]

with open('public/home.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Block successfully moved!")
