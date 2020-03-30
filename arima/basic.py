# Create a data frame.

learning_progress = pd.DataFrame()

# Add a range of 100 dates starting Jan 1, 2017.
learning_progress['date'] = pd.date_range(start='2017-01-01', periods=100)

# Add linearly increasing knowledge and oscillating confidence.
learning_progress['knowledge'] = np.arange(0, 100)
learning_progress['confidence'] = 10 * \
                                   np.cos(np.arange(0, 100) \
                                   * np.pi / 3.5) + np.arange(0, 100)
