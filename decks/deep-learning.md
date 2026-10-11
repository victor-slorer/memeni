---
schema: 1
topic: deep-learning
---

### written
Minimising the cross-entropy loss is equivalent to maximising the ___ of the training labels.
- answer: likelihood | log-likelihood | log likelihood | the likelihood
- explain: Cross-entropy is the negative log-likelihood of the labels under the model's predicted distribution, so the standard losses are all maximum likelihood in disguise (Prince ch. 5).

### written
Which algorithm computes the gradient of the loss for every parameter using one forward pass and one backward pass?
- answer: backpropagation | backprop | backward propagation
- explain: It applies the chain rule backwards through the network and reuses the activations stored in the forward pass, so all gradients cost about as much as one extra pass.

### written
Which activation function computes max(0, x)?
- answer: ReLU | rectified linear unit
- explain: ReLU is cheap and does not saturate for positive inputs, so gradients do not vanish there; a unit whose inputs are always negative outputs zero and stops learning ("dying ReLU").

### written
Which function turns a vector of scores into a probability distribution over classes?
- answer: softmax | soft max
- explain: softmax(z)_k = exp(z_k) / Σ_j exp(z_j), so the outputs are positive and sum to 1; it is paired with cross-entropy for multiclass classification (sigmoid is the two-class case).

### written
Assuming a Normal (Gaussian) output distribution with fixed variance, maximum likelihood for regression gives which loss?
- answer: least squares | least-squares | mean squared error | MSE | squared error | sum of squared errors
- explain: The Gaussian log-likelihood is a constant minus the squared error over 2σ², so maximising it is the same as minimising squared error (Prince ch. 5).

### multiple
Which of these are regularisation techniques?
- correct: Dropout | L2 weight decay | Early stopping | Data augmentation
- wrong: Adding more parameters | Training until the training loss reaches zero
- explain: Each limits how closely the model can fit noise in the training data: penalising large weights, randomly dropping units, stopping before overfitting, or adding varied training data.

### truefalse
The noise in mini-batch SGD's gradient estimates can help training rather than only hurt it.
- answer: true
- explain: Each step uses a random subset, so the gradient is a noisy but cheap estimate; the noise helps escape poor regions of the loss surface and acts as implicit regularisation (Prince ch. 6 and 9).

### written
Which optimiser adapts a per-parameter learning rate using running averages of the gradient and of the squared gradient?
- answer: Adam
- explain: Adam combines momentum (the first moment) with RMSProp-style scaling by the second moment, plus bias correction for the first steps.

### written
Which weight initialisation for ReLU networks draws weights with variance 2 / fan_in?
- answer: He | He initialization | He initialisation | Kaiming | Kaiming initialization | Kaiming initialisation
- explain: The factor 2 compensates for ReLU zeroing half of its inputs, keeping activation variance stable across layers so it neither explodes nor vanishes (Prince ch. 7).

### written
What problem in very deep networks do residual (skip) connections mainly address?
- answer: vanishing gradients | vanishing gradient | the vanishing gradient problem | shattered gradients | degradation
- explain: Each block computes x + f(x), so the identity path lets gradients flow straight back and very deep networks become trainable (Prince frames this as fixing shattered gradients).

### written
Because a convolution applies the same kernel at every position, shifting the input shifts the feature map. What is this property called?
- answer: translation equivariance | equivariance | translation-equivariance | shift equivariance
- explain: Weight sharing makes a pattern's response move with the pattern; pooling then adds some translation invariance on top.

### written
A 32×32 input goes through a 3×3 convolution with stride 1 and no padding. What is the spatial size of the output?
- answer: 30x30 | 30 x 30 | 30×30 | 30 × 30 | 30
- explain: Output size = (n + 2p − k) / s + 1 = (32 − 3) / 1 + 1 = 30; padding of 1 would keep it at 32.

### written
In attention, the weights are the softmax of the dot products between the queries and the ___.
- answer: keys | the keys | key
- explain: Attention(Q, K, V) = softmax(QKᵀ / √d_k)V: query-key similarity decides how much of each value vector goes into the output.

### truefalse
Self-attention on its own ignores the order of the input tokens, which is why transformers add positional encodings.
- answer: true
- explain: Attention is permutation-equivariant (shuffle the tokens and the outputs shuffle the same way), so position has to be injected through positional encodings or embeddings.

### truefalse
Batch normalisation uses the statistics of the current mini-batch at inference time.
- answer: false
- explain: During training it normalises with the batch mean and variance; at inference it uses running averages collected during training, so an output does not depend on the rest of the batch.

### written
What is it called when test error rises, then falls again once a model has enough capacity to fit the training data exactly?
- answer: double descent
- explain: Test error follows the classic U-curve, peaks around the point where the model can just interpolate the training data, then decreases again in the over-parameterised regime (Prince ch. 8).
