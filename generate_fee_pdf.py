from fpdf import FPDF

pdf = FPDF()
pdf.add_page()
pdf.set_font("Arial", size=10)

text = """
OFFICIAL CHITKARA UNIVERSITY FEE STRUCTURE 2026

4-Year B.E. in Computer Science Engineering (CSE) with Specialisation in Artificial Intelligence & Future Technologies
Semester 1: Program Fee 2,05,000 | ETS 25,000 | Total 2,30,000
Semester 2: Program Fee 2,05,000 | CAS 25,000 | Total 2,30,000
Semester 3: Program Fee 2,25,000 | Total 2,25,000
Semester 4: Program Fee 2,25,000 | Total 2,25,000
Semester 5: Program Fee 2,47,500 | Total 2,47,500
Semester 6: Program Fee 2,47,500 | Total 2,47,500
Semester 7: Program Fee 2,47,500 | Total 2,47,500
Semester 8: Program Fee 2,47,500 | Total 2,47,500

4-Year B.E. in Computer Science Engineering (CSE) with specialisation in Artificial Intelligence & Machine Learning with Microsoft
Semester 1: Program Fee 1,55,000 | ETS 25,000 | Total 1,80,000
Semester 2: Program Fee 1,55,000 | CAS 25,000 | Total 1,80,000
Semester 3 & 4: Total 1,75,000 per semester
Semester 5 to 8: Total 1,92,500 per semester

4-Year B.E. in Computer Science & Engineering (CSE) Program
Semester 1: Program Fee 1,30,000 | ETS 25,000 | Total 1,55,000
Semester 2: Program Fee 1,30,000 | CAS 25,000 | Total 1,55,000
Semester 3 & 4: Total 1,50,000 per semester
Semester 5 to 8: Total 1,65,000 per semester

4-Year B.E. in Electronics & Communication Engineering / Electrical / Mechanical / Civil
Semester 1 & 2: Total 1,25,000 per semester (includes ETS/CAS)
Semester 3 to 8: Total 1,00,000 per semester

4-Year B.E. in Mechanical/Electrical Engineering with minor in CSE
Semester 1 & 2: Total 1,35,000 per semester
Semester 3 to 8: Total 1,10,000 per semester
"""
for line in text.split('\n'):
    pdf.cell(200, 10, txt=line, ln=True, align='L')

pdf.output("data/extracted_official_fees.pdf")
