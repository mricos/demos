fig = plt.figure(num=None, figsize=(10, 8))
     ...: lp=learning_progress.values
     ...: for n in range(10,100):
     ...:     plt.clf
     ...:     plt.plot(lp[1:n,1],lp[1:n,2])
     ...:     plt.show(block=False)
     ...:     plt.pause(0.05)

