
import csv
import json
import re

input_file = '회원정보_20260110.csv'
output_file = 'src/data/migrated_members.json'

members = []

def parse_credits(text):
    if not text:
        return 0
    if '무제한' in text:
        return 100 # Arbitrary high number for unlimited or handle specially
    match = re.search(r'(\d+)회', text)
    if match:
        return int(match.group(1))
    return 0

def parse_branch(text):
    if '마포' in text:
        return 'mapo'
    if '광흥창' in text or '광흥장' in text:
        return 'gwangheungchang'
    return 'gwangheungchang' # Default

try:
    with open(input_file, mode='r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader) # Skip header
        
        for row in reader:
            if len(row) < 26: 
                continue # Skip invalid lines
                
            branch_raw = row[0]
            name = row[1]
            phone = row[7]
            subject = row[18]
            reg_date_raw = row[24] # 등록일자
            end_date_raw = row[25] # 만기일자
            
            if not name:
                continue

            members.append({
                "id": str(len(members) + 10000), # Generate ID
                "name": name,
                "phone": phone,
                "phoneLast4": phone[-4:] if len(phone) >= 4 else "0000",
                "subject": subject,
                "credits": parse_credits(subject),
                "homeBranch": parse_branch(branch_raw),
                "regDate": reg_date_raw if reg_date_raw else "",
                "startDate": reg_date_raw if reg_date_raw else "", # Assuming start = reg for migration
                "endDate": end_date_raw if end_date_raw else "",
                "amount": 0, # Not in CSV
                "lastAttended": "" 
            })

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(members, f, ensure_ascii=False, indent=2)
    
    print(f"Successfully processed {len(members)} members.")

except Exception as e:
    print(f"Error: {e}")
