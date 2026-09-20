import pandas as pd

m = pd.read_csv("manifest.csv")
print(m.pivot_table(index=["class", "source"], columns="split", values="new_path",
                    aggfunc="count", fill_value=0, margins=True))
t = m.groupby(["split", "class"]).size().unstack(fill_value=0)
t["unsafe_%"] = (t["unsafe"] / (t["safe"] + t["unsafe"]) * 100).round(1)
print("\n", t)
g = m.groupby("group")["split"].nunique()
print("\nNhóm nằm ở nhiều hơn 1 tập (phải bằng 0):", int((g > 1).sum()))