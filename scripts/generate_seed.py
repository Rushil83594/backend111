#!/usr/bin/env python3
"""Generates migrations/0002_seed_menu.sql from the menu data below.

Edit the data, run `python3 scripts/generate_seed.py`, and commit the result.
For changes AFTER the first deploy, write a new numbered migration instead of
re-generating 0002 (see README).
"""
import re
from pathlib import Path

def slug(n): return re.sub(r"[^a-z0-9]+", "-", n.lower()).strip("-")
def cents(x): return round(x * 100)
def q(v):
    if v is None: return "NULL"
    if isinstance(v, bool): return "1" if v else "0"
    if isinstance(v, (int, float)): return str(v)
    return "'" + str(v).replace("'", "''") + "'"

out, items = [], {}
def ins(table, cols, rows):
    for r in rows:
        out.append(f"INSERT INTO {table} ({', '.join(cols)}) VALUES ({', '.join(q(v) for v in r)});")

# ---- stores (sample locations: New York, California, Texas) ----
ins("stores", ["name","address","city","state","zip","delivery_fee_cents","tax_bps"], [
    ("Brasa Verde", "350 5th Ave", "New York", "New York", "10118", 399, 888),
    ("Brasa Verde", "1 Court St", "Brooklyn", "New York", "11201", 399, 888),
    ("Brasa Verde", "500 Mission St", "San Francisco", "California", "94105", 449, 863),
    ("Brasa Verde", "7000 Hollywood Blvd", "Los Angeles", "California", "90028", 449, 950),
    ("Brasa Verde", "100 Congress Ave", "Austin", "Texas", "78701", 349, 825),
    ("Brasa Verde", "1200 Main St", "Dallas", "Texas", "75202", 349, 825),
])

# ---- ingredient data: (name, price, calories, subtitle, tag) ----
PRO = [("Pollo Asado",9.55,180,"Fresh taste of lime & cilantro","All-new"),("Chicken",8.95,180),("Steak",10.95,150),
       ("Beef Barbacoa",10.95,170),("Carnitas",9.70,210),("Sofritas",8.95,150,"Plant-based protein"),("Veggie",8.95,0,"Includes guacamole")]
QPRO = [("Pollo Asado",10.25,180,"Fresh taste of lime & cilantro","All-new"),("Chicken",9.50,180),("Steak",11.50,150),
        ("Beef Barbacoa",11.50,170),("Carnitas",10.25,210),("Sofritas",9.50,150,"Plant-based protein"),("Cheese Only",6.50,0,"Includes guacamole")]
RICE = [("White Rice",0,210),("Brown Rice",0,210),("No Rice",0,0)]
BEANS = [("Black Beans",0,130),("Pinto Beans",0,130),("No Beans",0,0)]
SAL = [("Fresh Tomato Salsa",0,25,"Mild"),("Roasted Chili-Corn Salsa",0,80,"Medium"),
       ("Tomatillo-Green Chili Salsa",0,15,"Medium"),("Tomatillo-Red Chili Salsa",0,30,"Hot")]
EXTRA = [("Sour Cream",0,110),("Fajita Veggies",0,20),("Cheese",0,110),("Romaine Lettuce",0,5)]
CLS = ("Cilantro Lime Sauce",1.00,80,"Made fresh daily","New")
GUAC = ("Guacamole",2.90,230)
TOP = [CLS, GUAC, *SAL, *EXTRA, ("Queso Blanco",1.45,120)]
INC = [RICE[0], RICE[1], BEANS[0], BEANS[1], *SAL, *EXTRA]
CP = [("Chips",1.85,540,2.35,550),("Chips & Guacamole",4.75,770,5.25,780),("Large Chips",2.50,810,3.20,790),
      ("Large Chips & Large Guacamole",8.30,1270,9.00,1290),("Chips & Fresh Tomato Salsa",2.15,565,2.65,590),
      ("Chips & Tomatillo-Red Chili Salsa",2.15,570,2.65,640),("Chips & Tomatillo-Green Chili Salsa",2.15,555,2.65,600),
      ("Chips & Roasted Chili-Corn Salsa",2.15,620,2.65,670),("Chips & Queso Blanco",4.75,780,5.25,790),
      ("Large Chips & Large Queso Blanco",8.30,1290,9.00,1310)]
CHIPS = []
for n, p, c, p2, c2 in CP:
    CHIPS += [(n, p, c), (n.replace("Chips", "Chili Lime Chips", 1), p2, c2, None, "New")]
SIDES = [("Side of Cilantro Lime Sauce",1.50,160,"Made fresh daily","New"),("Large Side of Cilantro Lime Sauce",3.00,320,"Made fresh daily","New"),
         ("Side of Guacamole",2.90,230),("Large Side of Guacamole",5.80,460),("Side of Queso Blanco",2.90,240),
         ("Large Side of Queso Blanco",5.80,480),("Tortilla on the Side",0.50,320),("Large Fresh Tomato Salsa",2.25,40,"Mild"),
         ("Large Tomatillo-Red Chili Salsa",2.25,90,"Hot"),("Large Tomatillo-Green Chili Salsa",2.25,45,"Medium"),
         ("Large Roasted Chili-Corn Salsa",2.25,120,"Medium")]
CUPS = [("Side of Pollo Asado",4.35,220,"37g protein","All-new"),("Side of Chicken",3.75,180,"32g protein"),("Side of Steak",5.75,150,"21g protein")]
DRINKS = [("Organic Watermelon Limeade",2.90,230),("Organic Lemonade",2.90,170),("Organic Mandarin Agua Fresca",2.90,190),
          ("Organic Berry Agua Fresca",2.90,200),("Fountain Drink",2.90,0,"Soda and iced tea"),("Mexican Coca-Cola",3.45,150),
          ("Mexican Sprite",3.45,160),("Coke Zero",3.45,0),("San Pellegrino Sparkling",3.00,0),("Poppi Strawberry Lemon",3.20,30),
          ("Poppi Orange",3.20,25),("Jarritos Mango",3.45,140),("Jarritos Guava",3.45,110),("Tractor Organic Lemonade",3.50,140),
          ("Apple Juice",3.50,240),("Open Water Still",3.15,0)]
def kp(rows, price): return [(r[0], price, r[1], *(r[2:] if len(r) > 2 else ())) for r in rows]
KID_PRO = kp([("Pollo Asado",90,"Fresh taste of lime & cilantro","All-new"),("Chicken",90),("Steak",70),("Beef Barbacoa",90),
              ("Carnitas",110),("Sofritas",70,"Plant-based protein"),("Queso Blanco",120),("Guacamole",110)], 5.50)
KIDQ_PRO = kp([("Pollo Asado",80,"Fresh taste of lime & cilantro","All-new"),("Chicken",80),("Steak",70),("Beef Barbacoa",80),
               ("Carnitas",110),("Guacamole",110,"Served on the side"),("Sofritas",70,"Plant-based protein")], 5.10) + [("Cheese Only",4.30,110)]

# ---- sections: (id, title, note, mode, max, required, default_index, pricing, extra_cents, rows) ----
S = [
 ("protein-std","Protein or Veggie","Choose up to two.","multi",2,1,None,"base_plus_extra",250,PRO),
 ("rice","Rice",None,"single",None,0,None,"sum",0,RICE),
 ("beans","Beans",None,"single",None,0,None,"sum",0,BEANS),
 ("top","Top Things Off",None,"multi",None,0,None,"sum",0,TOP),
 ("options-burrito","Options",None,"multi",None,0,None,"sum",0,[("Double Wrap with Tortilla",0.50,320)]),
 ("protein-quesadilla","Protein or Veggie","Choose up to two.","multi",2,1,None,"base_plus_extra",250,QPRO),
 ("quesa-addins","Optional Add-ins",None,"multi",None,0,None,"sum",0,[("Fajita Veggies",0,20)]),
 ("quesa-sides","Included Sides","Choose up to three.","multi",3,0,None,"sum",0,INC+[("Smoked Honey Vinaigrette",0,220,"Served on the side"),("No Included Sides",0,0)]),
 ("quesa-onside","Add-ons I Always on the Side",None,"multi",None,0,None,"sum",0,[CLS,GUAC]),
 ("taco-qty","Quantity",None,"single",None,0,0,"sum",0,[("Three Tacos",0,0),("One Taco",0,0)]),
 ("taco-tortilla","Tortilla",None,"single",None,1,None,"sum",0,[("Crispy Corn Tortilla",0,210),("Soft Flour Tortilla",0,250)]),
 ("taco-toppings","Included Toppings","Choose up to five.","multi",5,0,None,"sum",0,INC),
 ("kid-tortilla","Tortilla",None,"single",None,1,None,"sum",0,[("2 Soft Flour Tortillas",0,170),("2 Crispy Corn Tortillas",0,140)]),
 ("protein-kid-build","Protein or Veggie",None,"single",None,1,None,"sum",0,KID_PRO),
 ("kid-toppings","Toppings","Choose up to two.","multi",2,0,None,"sum",0,INC+[("No Included Toppings",0,0)]),
 ("kidq-tortilla","Tortilla",None,"single",None,1,0,"sum",0,[("Soft Flour Tortilla",0,80)]),
 ("protein-kid-quesadilla","Protein or Veggie",None,"single",None,1,None,"sum",0,KIDQ_PRO),
 ("kidq-sides","Included Sides",None,"single",None,0,None,"sum",0,[("Kid's Chips",0,140),("Kid's Fruit",0,35),("No Included Sides",0,0)]),
 ("tail-chips","Chips & Dips",None,"multi",None,0,None,"sum",0,CHIPS),
 ("tail-sides","Single Sides",None,"multi",None,0,None,"sum",0,SIDES),
 ("tail-cups","High Protein Cups",None,"multi",None,0,None,"sum",0,CUPS),
 ("tail-drinks","Drinks",None,"multi",None,0,None,"sum",0,DRINKS),
]
sec_rows, si_rows = [], []
for sid, title, note, mode, mx, req, dflt, pricing, extra, rows in S:
    sec_rows.append((sid, title, note, mode, mx, req, dflt, pricing, extra))
    for i, r in enumerate(rows):
        name, price, cal = r[0], r[1], r[2]
        sub = r[3] if len(r) > 3 else None
        tag = r[4] if len(r) > 4 else None
        items[slug(name)] = name
        si_rows.append((sid, slug(name), cents(price), cal, sub, tag, i))

# ---- categories ----
STD = ["protein-std","rice","beans","top"]
TAIL = ["tail-chips","tail-sides","tail-cups","tail-drinks"]
DESC = {
 "burrito":"Freshly grilled meat or sofritas wrapped in a warm flour tortilla with rice, beans or fajita veggies, topped with guac, salsa, queso blanco, sour cream or cheese.",
 "burrito-bowl":"Freshly grilled meat or sofritas served in a bowl with rice, beans or fajita veggies, topped with guac, salsa, queso blanco, sour cream or cheese.",
 "salad":"Meat or sofritas served on a fresh supergreens lettuce blend. Add beans, queso blanco, salsa, guacamole, sour cream or cheese.",
 "quesadilla":"Cheese in a flour tortilla with your choice of meat, sofritas or fajita veggies and three included sides.",
 "tacos":"Freshly grilled meat, sofritas or guacamole, and up to five toppings served in a soft or hard-shell tortilla.",
 "kid-build":"Your choice of meat, guacamole or queso, and two toppings with a pair of crispy corn or soft flour tortillas. Includes fruit or kid's chips and organic juice or milk.",
 "kid-quesadilla":"With a side of rice and beans. Includes fruit or kid's chips and organic juice or milk.",
}
# slug, name, description, kind, require_any, parent, show_on_menu, blurb, badge, sort, sections
C = [
 ("family-meals","Family Meals","Limit one per bag.","cards",0,None,1,"Serves 4 to 6 people","Digital only",1,[]),
 ("burrito","Burrito",DESC["burrito"],"builder",0,None,1,None,None,2,STD+["options-burrito"]+TAIL),
 ("burrito-bowl","Burrito Bowl",DESC["burrito-bowl"],"builder",0,None,1,None,None,3,STD+TAIL),
 ("high-protein","High Protein Menu","The tastiest way to add protein to your day, from 15g to 81g in one item.","cards",0,None,1,None,"New",4,[]),
 ("quesadilla","Quesadilla",DESC["quesadilla"],"builder",0,None,1,None,"Digital only",5,["protein-quesadilla","quesa-addins","quesa-sides","quesa-onside"]+TAIL),
 ("salad","Salad",DESC["salad"],"builder",0,None,1,None,None,6,STD+TAIL),
 ("tacos","Tacos",DESC["tacos"],"builder",0,None,1,None,None,7,["taco-qty","taco-tortilla","protein-std","taco-toppings"]+TAIL),
 ("kids","Kid's Meal","Build your own meal or enjoy a quesadilla, both served with a drink and seasonal fruit or chips.","chooser",0,None,1,None,None,8,[]),
 ("kid-build","Kid's Build Your Own",DESC["kid-build"],"builder",0,"kids",0,None,None,9,["kid-tortilla","protein-kid-build","kid-toppings"]),
 ("kid-quesadilla","Kid's Quesadilla",DESC["kid-quesadilla"],"builder",0,"kids",0,None,None,10,["kidq-tortilla","protein-kid-quesadilla","rice","beans","kidq-sides"]),
 ("chips-sides","Chips & Sides","Everything else you need to round out your meal.","builder",1,None,1,None,None,11,TAIL[:3]),
 ("drinks","Drinks","Choose from a variety of sodas, iced teas and lemonades.","builder",1,None,1,None,None,12,["tail-drinks"]),
]
cat_rows, cs_rows = [], []
for slug_, name, desc, kind, rq, parent, show, blurb, badge, sort, secs in C:
    cat_rows.append((slug_, name, desc, kind, rq, None, show, blurb, badge, sort))
    cs_rows += [(slug_, s, i) for i, s in enumerate(secs)]
parents = {r[0]: r[5] for r in C}

# ---- cards ----
FAMD = "{}, white rice, black beans, cheese, romaine lettuce, fresh tomato salsa, tomatillo-red chili salsa, sour cream, guacamole, 1 large chips and 10 soft flour tortillas."
CARDS = [
 ("fam-chicken","family-meals","Family Meal - Chicken","Serves 4-6 people","520 - 1220 cal",48.00,FAMD.format("Chicken"),None),
 ("fam-steak","family-meals","Family Meal - Steak","Serves 4-6 people","490 - 1190 cal",59.00,FAMD.format("Steak"),None),
 ("fam-sofritas","family-meals","Family Meal - Sofritas","Serves 4-6 people","490 - 1190 cal",48.00,FAMD.format("Sofritas"),None),
 ("fam-chips-sides","family-meals","2 Large Chips & 3 Large Sides","Serves 4-6 people","430 - 440 cal",18.00,"2 large chips, large queso blanco, large guacamole and fresh tomato salsa.",None),
 ("hp-cup-pollo","high-protein","High Protein Cup - Pollo Asado","37g protein","220 cal",4.35,"A side of freshly grilled pollo asado packed with 37g of real protein.",None),
 ("hp-double-bowl","high-protein","Double High Protein Bowl","51g protein","760 cal",12.70,"Double pollo asado, light white rice, black beans, fajita veggies, fresh tomato salsa, jack cheese, extra romaine.","burrito-bowl"),
 ("hp-fiber-bowl","high-protein","High Protein-High Fiber Bowl","46g protein","540 cal",8.95,"Pollo asado, light brown rice, black beans, fajita veggies, corn salsa, lettuce.","burrito-bowl"),
 ("hp-taco","high-protein","High Protein Taco","15g protein","190 cal",3.50,"Soft flour tortilla, pollo asado, fajita veggies, fresh tomato salsa, jack cheese, lettuce.","tacos"),
 ("hp-cup-chicken","high-protein","High Protein Cup - Chicken","32g protein","180 cal",3.75,"A side of freshly grilled chicken packed with 32g of real protein.",None),
 ("hp-cup-steak","high-protein","High Protein Cup - Steak","21g protein","150 cal",5.75,"A side of freshly grilled steak packed with 21g of real protein.",None),
 ("hp-lowcal-bowl","high-protein","High Protein - Low Calorie Bowl","56g protein","470 cal",11.85,"Pollo asado, supergreens lettuce mix, fajita veggies, fresh tomato salsa and guacamole.","salad"),
 ("hp-double-burrito","high-protein","Double High Protein Burrito","79g protein","840 cal",12.70,"Double pollo asado, fajita veggies, fresh tomato salsa, jack cheese and lettuce.","burrito"),
]
card_rows = [(i, c, n, s, cal, cents(p), d, m, k) for k, (i, c, n, s, cal, p, d, m) in enumerate(CARDS)]

# ---- write everything, parents after categories exist ----
ins("categories", ["slug","name","description","kind","require_any","parent_slug","show_on_menu","blurb","badge","sort"], cat_rows)
for child, parent in parents.items():
    if parent: out.append(f"UPDATE categories SET parent_slug = {q(parent)} WHERE slug = {q(child)};")
ins("items", ["id","name"], sorted(items.items()))
ins("sections", ["id","title","note","mode","max_select","required","default_index","pricing","extra_cents"], sec_rows)
ins("category_sections", ["category_slug","section_id","sort"], cs_rows)
ins("section_items", ["section_id","item_id","price_cents","calories","subtitle","tag","sort"], si_rows)
ins("menu_cards", ["id","category_slug","name","serving","calories_text","price_cents","description","make_own_slug","sort"], card_rows)

ins("catering_tiers", ["id","name","badge","price_per_person_cents","min_people","description","sort"], [
 ("single","Single","Best value",925,10,"1 protein, 2 bases, 2 toppings, 2 salsas and 1 type of tortilla.",1),
 ("double","Double","Fan favorite",1250,10,"2 proteins with more bases, toppings and salsas.",2),
 ("triple","Triple","Most variety",1400,10,"3 proteins for the biggest spread.",3)])
ins("catering_products", ["id","kind","name","tag","description","price_cents","unit","min_people","sort"], [
 ("build-plant","build","Plant Powered","Double protein","Double guacamole, plant-based protein, salad lettuce, brown rice, fajita veggies, cheese, soft flour tortillas.",1250,"person",10,1),
 ("build-work","build","Work Anywhere","Double protein","Chicken, steak, white rice, guacamole, salad lettuce, fajita veggies, cheese, soft flour tortillas.",1250,"person",10,2),
 ("build-gettogether","build","Small Get-Together","Triple protein","2x chicken, steak, 2x white rice, guacamole, queso blanco, black beans, sour cream, tortillas.",1400,"person",10,3),
 ("build-easy","build","Taking It Easy","Burritos by the box","Half chicken, half steak, white rice, black beans, chips, salsa, guacamole and sour cream on the side.",925,"person",10,4),
 ("chips-dips","chips","Chips & Dips","Serves 10 to 15","House chips, all 4 salsas, and your choice of guacamole or queso blanco.",4200,"order",1,5),
 ("burrito-box","box","Burritos by the Box","Minimum 6 people","Mix and match burritos. Every two come with chips, tomatillo green chili salsa and sour cream.",925,"person",6,6)])
ins("rewards_exchange", ["points","label","sort"], [(90,"Tortilla",1),(360,"Chips",2),(420,"Drink",3),(520,"Guacamole",4),
    (720,"Extra protein",5),(840,"Bowl or salad",6),(1650,"Burrito",7),(1800,"Burrito and chips",8)])
ins("nutrition_meals", ["id","name","calories","fat_g","protein_g","carbs_g","sort"], [
 ("burrito","Burrito",320,9,8,50,1),("burrito-bowl","Burrito Bowl",290,8,9,38,2),("high-protein","High Protein Menu",410,12,38,30,3),
 ("quesadilla","Quesadilla",480,26,22,36,4),("salad","Salad",210,10,12,18,5),("tacos","Tacos",180,7,7,22,6),
 ("kids","Kid's Meal",260,9,10,32,7),("chips-sides","Chips & Sides",240,12,3,31,8)])

dest = Path(__file__).resolve().parent.parent / "migrations" / "0002_seed_menu.sql"
dest.write_text("-- Generated by scripts/generate_seed.py. Do not edit by hand.\n" + "\n".join(out) + "\n")
print(f"wrote {dest.name}: {len(out)} statements")
