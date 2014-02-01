import SEAPI
import simplejson as json
import numpy as np
from collections import defaultdict

se = SEAPI.SEAPI()

all_sites = se.fetch("sites")

for site in all_sites:
    if ('total_users' not in site) and (site['site_type'] == 'main_site'):
        try:
            site.update(se.fetch_one("info", site=site['api_site_parameter'])[0])
        except:
            print "Error at {0}".format(site['api_site_parameter'])

full_site_names = [x['api_site_parameter']
                   for x in all_sites if x['site_type'] == 'main_site']

sites_counts = [(site['api_site_parameter'], site.get('total_users',-1))
               for site in all_sites if site['site_type'] == 'main_site']

filter_acidrep="!*MxJcsZ)vaN5BhT9"
users_bare = {}

for i, (k, v) in enumerate(sites_counts[:-1]):
    if v > 0 and k not in users_bare:
        print i, k, v
        users_site = se.fetch("users",
                              site=k,
                              sort="reputation", order="desc", min=200,
                              filter=filter_acidrep)
        print "\n Took %.1fs, average per one: %.2fs" % (np.sum(se.last_response_times),
                                                         np.mean(se.last_response_times)) 
        users_bare[k] = users_site

with open("../data_raw/se_users_rep200_noso_new.json","w") as f:
    json.dump(users_bare, f, indent=1)

    k, v =  sites_counts[-1]
if v > 0 and k not in users_bare:
        print k, v
        stackoverflow = se.fetch("users",
                              site=k,
                              sort="reputation", order="desc", min=500,
                              filter=filter_acidrep)
        print "\n Took %.1fs, average per one: %.2fs" % (np.sum(se.last_response_times),
                                                         np.mean(se.last_response_times))

        with open("../data_raw/se_users_rep500_soonly_20131105.json","w") as f:
    json.dump(stackoverflow, f, indent=1)
