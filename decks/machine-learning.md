---
schema: 1
topic: machine-learning
---

### truefalse
A model with high bias is usually underfitting.
- answer: true
- explain: A high-bias model is too simple for the pattern, so training and test error are both high; high variance (overfitting) shows as low training error but high test error.

### written
Which data split should you use to choose hyperparameters?
- answer: validation | validation set | the validation set | validation data | dev set | development set
- explain: Tuning on the test set leaks it into model selection and makes the final score optimistic; the test set is used once, at the very end.

### written
Which classification metric is TP / (TP + FP)?
- answer: precision
- explain: Precision is how many of the predicted positives were right; recall, TP / (TP + FN), is how many of the actual positives were found.

### truefalse
On a dataset with 99% negative examples, accuracy is a good metric for judging a classifier.
- answer: false
- explain: Always predicting "negative" scores 99% accuracy while finding nothing; use precision, recall, F1 or PR-AUC instead.

### written
Splitting the data into k parts and training k times, each time holding out a different part for validation, is called ___.
- answer: k-fold cross-validation | k-fold cross validation | cross-validation | cross validation | k-fold
- explain: Every example is used for validation exactly once, giving a less noisy estimate than a single split, at k times the training cost.

### multiple
Which of these are supervised learning tasks?
- correct: Predicting house prices from features | Classifying emails as spam or not spam
- wrong: Clustering customers without labels | Reducing dimensionality with PCA
- explain: Supervised learning learns from labelled input-output pairs; clustering and PCA find structure in unlabelled data (unsupervised learning).

### written
Which clustering algorithm alternates between assigning points to the nearest centroid and moving each centroid to the mean of its points?
- answer: k-means | kmeans | k means
- explain: k-means minimises within-cluster squared distance; you have to choose k yourself, and the result depends on initialisation (k-means++ helps).

### written
Which regularisation adds the sum of absolute weight values to the loss and tends to make weights exactly zero?
- answer: L1 | L1 regularization | L1 regularisation | lasso | lasso regression
- explain: The L1 penalty's constant-size gradient pushes small weights all the way to zero (sparsity); L2 (ridge, weight decay) shrinks weights smoothly without zeroing them.

### written
In the gradient descent update θ ← θ − α∇L, what is α called?
- answer: learning rate | the learning rate | step size | the step size
- explain: Too large and training oscillates or diverges, too small and it converges slowly; schedules usually decay it during training.
