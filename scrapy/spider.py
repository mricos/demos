import scrapy

class WikiSpider(scrapy.Spider):
    name = 'wikispider'
    start_urls = ['https://en.wikipedia.org/wiki/Speech_recognition',
                  'https://en.wikipedia.org/wiki/Phoneme']


    def parse(self, response):
        for title in response.css('h2'):
            yield {'title': title.css('a ::text').extract_first()}

        for next_page in response.css('div.prev-post > a'):
            yield response.follow(next_page, self.parse)
