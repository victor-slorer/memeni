---
schema: 1
topic: data-processing
---

### multiple
Why are NumPy array operations usually much faster than the equivalent Python loop?
- correct: The loop runs in compiled C code | The elements are stored contiguously with a single fixed dtype | There is no per-element type checking or object boxing
- wrong: NumPy automatically runs on the GPU | Python lists cannot hold numbers
- explain: A Python list holds pointers to separate number objects whose types are checked on every operation; a NumPy array is one typed block of memory processed by compiled (often SIMD) loops.

### truefalse
A NumPy array of 1,000,000 float64 values takes about 8 MB of memory.
- answer: true
- explain: float64 is 8 bytes per element in one contiguous buffer; a Python list of floats needs an 8-byte pointer plus a separate 24-byte float object per element.

### written
What is the shape of the result?
```python
np.ones((3, 1)) + np.ones((1, 4))
```
- answer: (3, 4) | (3,4) | 3x4 | 3 x 4 | 3×4
- explain: Broadcasting stretches size-1 dimensions to match, so (3, 1) and (1, 4) both become (3, 4) without copying the data.

### written
What does this print?
```python
import numpy as np
a = np.array([1, 2, 3])
b = a[1:]
b[0] = 99
print(a)
```
- answer: [ 1 99 3] | [1 99 3] | [1, 99, 3] | 1 99 3
- explain: Slicing a NumPy array returns a view on the same memory, so writing to b changes a; Python list slices copy (use `.copy()` to copy a NumPy array).

### written
What is the dtype of `np.array([1, 2.5])`?
- answer: float64 | np.float64 | float | numpy.float64
- explain: An array has a single dtype, so NumPy upcasts every element to a type that fits them all, here int to float64.

### written
Which pandas method combines two DataFrames on key columns, like an SQL JOIN?
- answer: merge | pd.merge | .merge | df.merge | DataFrame.merge | merge()
- explain: `df.merge(other, on="key", how="left")` mirrors SQL joins; `pd.concat` stacks frames along an axis instead of matching keys.

### written
Which pandas method splits rows into groups so you can aggregate each group, like SQL's GROUP BY?
- answer: groupby | .groupby | df.groupby | groupby()
- explain: `df.groupby("dept")["salary"].mean()` is the pandas equivalent of `SELECT dept, AVG(salary) ... GROUP BY dept`.

### written
`df.iloc` selects rows by integer position. What does `df.loc` select by?
- answer: label | labels | index labels | index label | row labels | the index
- explain: `loc` uses index and column labels, and label slices include the end point; `iloc` uses integer positions with the end excluded, like Python slices.

### written
Which pandas method replaces missing values (NaN) with a given value?
- answer: fillna | .fillna | df.fillna | fillna()
- explain: `fillna` fills NaN with a constant or a computed value such as the column median; `dropna` removes rows or columns that contain NaN instead.

### truefalse
Looping over a DataFrame with `iterrows()` is the fastest way to transform a column.
- answer: false
- explain: `iterrows` builds a pandas Series for every row in Python; vectorised column operations (`df["a"] * 2`) or built-in methods are typically orders of magnitude faster.

### written
Fitting a scaler on the full dataset before the train/test split causes ___.
- answer: data leakage | leakage | information leakage
- explain: The scaler's mean and standard deviation then include the test data, so the model indirectly sees it; fit preprocessing on the training split only (e.g. inside an sklearn Pipeline).

### written
What is it called when you rescale a feature to zero mean and unit variance?
- answer: standardization | standardisation | z-score normalization | z-score normalisation | z-score | z-scoring | standard scaling
- explain: z = (x − μ) / σ; min-max scaling to [0, 1] is the other common option and is more sensitive to outliers.

### written
Which encoding turns a categorical column into one binary column per category?
- answer: one-hot encoding | one-hot | one hot | one hot encoding | dummy encoding | dummy variables
- explain: e.g. `pd.get_dummies`; unlike mapping categories to 0, 1, 2 (label encoding), it does not imply an order between them.

### multiple
Which of these file formats store data by column?
- correct: Parquet | ORC
- wrong: CSV | JSON
- explain: Columnar formats store each column contiguously, so a query reads only the columns it needs and the data compresses well; CSV and JSON are row-oriented text.

### written
ETL stands for Extract, Transform and ___.
- answer: Load
- explain: Data is pulled from sources, cleaned and reshaped, then loaded into a warehouse; ELT loads the raw data first and transforms it inside the warehouse.
